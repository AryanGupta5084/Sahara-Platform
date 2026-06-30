const mongoose = require('mongoose');

const exerciseStepSchema = new mongoose.Schema({
    stepNumber: { type: Number, required: true },
    prompt: { type: String, required: true },
    stepType: { 
        type: String, 
        enum: ['instruction', 'user_input'], 
        default: 'user_input' 
    }
}, { _id: false });

const guidedExerciseSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true, 
        unique: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    category: { 
        type: String, 
        enum: ['Mindfulness', 'CBT', 'Stress Relief'], 
        required: true 
    },
    steps: [exerciseStepSchema]
}, { timestamps: true });

module.exports = mongoose.model('GuidedExercise', guidedExerciseSchema);