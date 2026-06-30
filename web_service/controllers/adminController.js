const Counselor = require('../models/Counselor');
const Appointment = require('../models/Appointment');
const LiveChatMessage = require('../models/LiveChatMessage');
const User = require('../models/User');
const JournalEntry = require('../models/JournalEntry');
const mongoose = require('mongoose');

function escapeRegex(text) {
    if (!text) return '';
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

exports.getAllCounselors = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;
        const { search } = req.query;

        let filter = {};
        if (search) {
            const searchRegex = new RegExp(escapeRegex(search), 'i');
            const users = await User.find({ username: searchRegex }).select('_id');
            const userIds = users.map(u => u._id);
            filter = {
                $or: [
                    { specialty: searchRegex },
                    { user: { $in: userIds } }
                ]
            };
        }

        const [counselors, total] = await Promise.all([
            Counselor.find(filter).populate('user', 'username email').skip(skip).limit(limit),
            Counselor.countDocuments(filter)
        ]);

        res.status(200).json({
            success: true,
            data: { items: counselors, total, pages: Math.ceil(total / limit), currentPage: page },
            error: null
        });
    } catch (error) {
        console.error("Admin failed to fetch counselors:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error while fetching counselors.' });
    }
};

exports.getCounselorById = async (req, res) => {
    try {
        const counselor = await Counselor.findById(req.params.id).populate('user', 'username email');
        if (!counselor) {
            return res.status(404).json({ success: false, data: null, error: 'Counselor not found.' });
        }
        res.status(200).json({ success: true, data: counselor, error: null });
    } catch (error) {
        console.error("Failed to fetch counselor by ID:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error.' });
    }
};

exports.createCounselor = async (req, res) => {
    try {
        const { userId, specialty, bio, availability, slotDuration, isActive } = req.body;
        const existingCounselor = await Counselor.findOne({ user: userId });
        if (existingCounselor) {
            return res.status(400).json({ success: false, data: null, error: 'Counselor profile already exists for this user.' });
        }
        const counselor = await Counselor.create({
            user: userId,
            specialty,
            bio,
            availability,
            slotDuration,
            isActive
        });
        res.status(201).json({ success: true, data: counselor, error: null });
    } catch (error) {
        console.error("Failed to create counselor:", error);
        res.status(400).json({ success: false, data: null, error: 'Failed to create counselor profile. Please check input.' });
    }
};

exports.updateCounselor = async (req, res) => {
    try {
        const counselor = await Counselor.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        }).populate('user', 'username email');
        if (!counselor) {
            return res.status(404).json({ success: false, data: null, error: 'Counselor not found.' });
        }
        res.status(200).json({ success: true, data: counselor, error: null });
    } catch (error) {
        console.error("Failed to update counselor:", error);
        res.status(400).json({ success: false, data: null, error: 'Failed to update counselor profile.' });
    }
};

exports.deleteCounselor = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const counselor = await Counselor.findById(req.params.id).session(session);
        if (!counselor) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, data: null, error: 'Counselor not found.' });
        }
        await Appointment.deleteMany({ counselor: counselor._id }).session(session);
        await LiveChatMessage.deleteMany({
            appointment: { $in: await Appointment.find({ counselor: counselor._id }).select('_id').session(session) }
        }).session(session);
        await Counselor.findByIdAndDelete(req.params.id).session(session);
        await session.commitTransaction();
        session.endSession();
        res.status(200).json({ success: true, data: { message: 'Counselor and associated data deleted successfully.' }, error: null });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Failed to delete counselor:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error while deleting counselor.' });
    }
};

exports.getAvailableUsersForCounselor = async (req, res) => {
    try {
        const existingCounselorUserIds = await Counselor.distinct('user');
        const availableUsers = await User.find({
            _id: { $nin: existingCounselorUserIds },
            isGuest: false
        }).select('_id username email');
        res.status(200).json({ success: true, data: availableUsers, error: null });
    } catch (error) {
        console.error("Failed to fetch available users:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error fetching available users.' });
    }
};

exports.getAllAppointmentsForAdmin = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;
        const { search } = req.query;

        let filter = {};
        if (search) {
            const searchRegex = new RegExp(escapeRegex(search), 'i');
            const users = await User.find({ username: searchRegex }).select('_id');
            const userIds = users.map(u => u._id);

            const counselors = await Counselor.find({ specialty: searchRegex }).select('_id');
            const counselorIds = counselors.map(c => c._id);

            filter = {
                $or: [
                    { user: { $in: userIds } },
                    { counselor: { $in: counselorIds } },
                    { status: searchRegex }
                ]
            };
        }

        const [appointments, total] = await Promise.all([
            Appointment.find(filter)
                .populate('user', 'username email')
                .populate({
                    path: 'counselor',
                    populate: { path: 'user', select: 'username email' }
                })
                .sort({ startTime: -1 })
                .skip(skip)
                .limit(limit),
            Appointment.countDocuments(filter)
        ]);

        res.status(200).json({
            success: true,
            data: { items: appointments, total, pages: Math.ceil(total / limit), currentPage: page },
            error: null
        });
    } catch (error) {
        console.error("Admin failed to fetch appointments:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error while fetching appointments.' });
    }
};

exports.updateAppointmentByAdmin = async (req, res) => {
    try {
        const { status } = req.body;
        const appointment = await Appointment.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
        if (!appointment) {
            return res.status(404).json({ success: false, data: null, error: 'Appointment not found.' });
        }
        res.status(200).json({ success: true, data: appointment, error: null });
    } catch (error) {
        console.error("Admin failed to update appointment:", error);
        res.status(400).json({ success: false, data: null, error: 'Failed to update appointment.' });
    }
};

exports.getGlobalAnalytics = async (req, res) => {
    try {
        const moodDistribution = await JournalEntry.aggregate([
            { $group: { _id: '$mood', count: { $sum: 1 } } },
            { $project: { _id: 0, mood: '$_id', count: 1 } }
        ]);
        
        const sentimentDistribution = await JournalEntry.aggregate([
            { $match: { analyzedSentiment: { $ne: null } } },
            { $group: { _id: '$analyzedSentiment', count: { $sum: 1 } } },
            { $project: { _id: 0, sentiment: '$_id', count: 1 } }
        ]);

        res.status(200).json({ success: true, data: { moodDistribution, sentimentDistribution }, error: null });
    } catch (error) {
        console.error("Global Analytics error:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error fetching global statistics.' });
    }
};