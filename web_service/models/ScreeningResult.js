const mongoose = require('mongoose');

const screeningResultSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        index: true 
    },
    test: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'ScreeningTest', 
        required: true 
    },
    answers: { 
        type: [Number], 
        required: true 
    },
    totalScore: { 
        type: Number, 
        required: true 
    },
    riskLevel: { 
        type: String, 
        required: true 
    },
    isEscalated: { 
        type: Boolean, 
        default: false 
    }
}, { timestamps: true });

screeningResultSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ScreeningResult', screeningResultSchema);