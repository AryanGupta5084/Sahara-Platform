const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/crypto');

const liveChatMessageSchema = new mongoose.Schema({
    appointment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
        required: true,
        index: true,
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    message: {
        type: String,
        required: true,
        get: decrypt,
        set: encrypt,
    },
}, {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
});

const LiveChatMessage = mongoose.model('LiveChatMessage', liveChatMessageSchema);

module.exports = LiveChatMessage;