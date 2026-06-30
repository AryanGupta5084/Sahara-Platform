const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: ['video', 'audio', 'article'] },
    url: { type: String, required: true },
    language: { 
        type: String, 
        required: true, 
        enum: ['en', 'hi', 'pa', 'bn', 'ta', 'te', 'ml', 'mr', 'gu', 'kn'], 
        default: 'en' 
    },
    tags: { type: [String], default: [] }
}, { timestamps: true });

resourceSchema.index({ language: 1 });
resourceSchema.index({ tags: 1 });

module.exports = mongoose.model('Resource', resourceSchema);