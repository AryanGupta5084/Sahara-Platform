const mongoose = require('mongoose');
const Counselor = require('../models/Counselor');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const ics = require('ics');

function dateToIcsArray(date) {
    return [
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes()
    ];
}

exports.getPublicCounselors = async (req, res) => {
    try {
        const counselors = await Counselor.find({ isActive: true }).populate('user', 'username');
        res.status(200).json({ success: true, data: counselors, error: null });
    } catch (error) {
        console.error("Error fetching counselors:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error fetching counselors.' });
    }
};

exports.getAvailableSlots = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ success: false, data: null, error: 'Date query parameter is required.' });
        }

        const counselor = await Counselor.findById(req.params.counselorId);
        if (!counselor || !counselor.isActive) {
            return res.status(404).json({ success: false, data: null, error: 'Counselor not found or inactive.' });
        }

        const targetDate = new Date(date);
        const dayOfWeek = targetDate.getUTCDay();

        const dayAvailability = counselor.availability.find(a => a.dayOfWeek === dayOfWeek);
        if (!dayAvailability) {
            return res.status(200).json({ success: true, data: [], error: null });
        }

        const startOfDay = new Date(targetDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const existingAppointments = await Appointment.find({
            counselor: counselor._id,
            startTime: { $gte: startOfDay, $lte: endOfDay },
            status: { $in: ['booked', 'confirmed'] }
        });

        const bookedTimes = existingAppointments.map(app => app.startTime.getTime());
        const availableSlots = [];
        
        const [startHour, startMinute] = dayAvailability.startTime.split(':').map(Number);
        const [endHour, endMinute] = dayAvailability.endTime.split(':').map(Number);
        
        let currentSlot = new Date(targetDate);
        currentSlot.setUTCHours(startHour, startMinute, 0, 0);
        
        const endSlot = new Date(targetDate);
        endSlot.setUTCHours(endHour, endMinute, 0, 0);

        while (currentSlot.getTime() + counselor.slotDuration * 60000 <= endSlot.getTime()) {
            if (!bookedTimes.includes(currentSlot.getTime()) && currentSlot.getTime() > Date.now()) {
                availableSlots.push(new Date(currentSlot));
            }
            currentSlot = new Date(currentSlot.getTime() + counselor.slotDuration * 60000);
        }

        res.status(200).json({ success: true, data: availableSlots, error: null });
    } catch (error) {
        console.error("Error calculating slots:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error calculating slots.' });
    }
};

exports.bookAppointment = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { counselorId, startTime, notes } = req.body;
        const counselor = await Counselor.findById(counselorId).session(session);
        if (!counselor || !counselor.isActive) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, data: null, error: 'Counselor not available.' });
        }

        const start = new Date(startTime);
        const end = new Date(start.getTime() + counselor.slotDuration * 60000);

        const conflict = await Appointment.findOne({
            counselor: counselorId,
            startTime: start,
            status: { $in: ['booked', 'confirmed'] }
        }).session(session);

        if (conflict) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, data: null, error: 'Slot already booked.' });
        }

        const appointment = await Appointment.create([{
            user: req.user.id,
            counselor: counselorId,
            startTime: start,
            endTime: end,
            notes
        }], { session });

        await session.commitTransaction();
        res.status(201).json({ success: true, data: appointment, error: null });
    } catch (error) {
        await session.abortTransaction();
        console.error("Error booking appointment:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error booking appointment.' });
    } finally {
        session.endSession();
    }
};

exports.getMyAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.find({ user: req.user.id })
            .populate({
                path: 'counselor',
                populate: { path: 'user', select: 'username' }
            })
            .sort({ startTime: 1 });
        res.status(200).json({ success: true, data: appointments, error: null });
    } catch (error) {
        console.error("Error fetching user appointments:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error fetching appointments.' });
    }
};

exports.cancelAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { status: 'cancelled_by_user' },
            { new: true }
        );
        if (!appointment) {
            return res.status(404).json({ success: false, data: null, error: 'Appointment not found or unauthorized.' });
        }
        res.status(200).json({ success: true, data: appointment, error: null });
    } catch (error) {
        console.error("Error cancelling appointment:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error cancelling appointment.' });
    }
};