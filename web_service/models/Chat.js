const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/crypto');

const chatSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    flag: {
        type: String,
        enum: ['anxiety', 'depression', 'neutral', 'stress', 'suicidal', null],
        default: null
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    isGuest: {
        type: Boolean,
        default: false
    },
    originalMessage: {
        type: String,
        get: decrypt,
        set: encrypt
    },
    message: {
        type: String,
        required: true,
        get: decrypt,
        set: encrypt
    },
    response: {
        type: String,
        required: true,
        get: decrypt,
        set: encrypt
    },
    sentiment: {
        type: String,
        required: true,
        enum: ['anxiety', 'depression', 'neutral', 'stress', 'suicidal']
    },
    confidence: {
        type: Number,
        required: true,
        min: 0,
        max: 1
    },
    needs_immediate_help: {
        type: Boolean,
        default: false
    },
    expireAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
});

chatSchema.index({ user: 1, sessionId: 1, createdAt: 1 });
chatSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Chat', chatSchema);