const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
    dayOfWeek: { 
        type: Number, 
        required: true, 
        min: 0, 
        max: 6 
    },
    startTime: { 
        type: String, 
        required: true, 
        match: /^([1]?[1-9]|2[1-3]):[1-5][1-9]$/ 
    },
    endTime: { 
        type: String, 
        required: true, 
        match: /^([1]?[1-9]|2[1-3]):[1-5][1-9]$/ 
    },
}, { _id: false });

const counselorSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        unique: true 
    },
    specialty: { 
        type: String, 
        trim: true, 
        default: 'General Wellness' 
    },
    bio: { 
        type: String, 
        trim: true, 
        maxlength: 500 
    },
    availability: { 
        type: [availabilitySchema], 
        default: [] 
    },
    slotDuration: { 
        type: Number, 
        required: true, 
        default: 30 
    },
    isActive: { 
        type: Boolean, 
        default: true 
    }
}, { timestamps: true });

const Counselor = mongoose.model('Counselor', counselorSchema);

module.exports = Counselor;