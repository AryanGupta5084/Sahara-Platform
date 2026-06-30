const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    counselor: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Counselor', 
        required: true 
    },
    startTime: { 
        type: Date, 
        required: true 
    },
    endTime: { 
        type: Date, 
        required: true 
    },
    status: {
        type: String,
        enum: ['booked', 'confirmed', 'completed', 'cancelled_by_user', 'cancelled_by_counselor'],
        default: 'booked'
    },
    notes: { 
        type: String, 
        trim: true, 
        maxlength: 500 
    },
}, { timestamps: true });

appointmentSchema.index({ user: 1, startTime: -1 });
appointmentSchema.index({ counselor: 1, startTime: -1 });
appointmentSchema.index({ counselor: 1, startTime: 1 }, { unique: true });

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;