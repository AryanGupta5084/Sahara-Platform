const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/crypto');

const journalEntrySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    mood: {
        type: String,
        required: true,
        enum: ['awful', 'bad', 'meh', 'good', 'great'],
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 10000,
        get: decrypt,
        set: encrypt,
    },
    analyzedSentiment: {
        type: String,
        enum: ['anxiety', 'depression', 'neutral', 'stress', 'suicidal', null],
    },
    entryDate: {
        type: Date,
        required: true,
    }
}, {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
});

journalEntrySchema.index({ user: 1, entryDate: 1 }, { unique: true });

const JournalEntry = mongoose.model('JournalEntry', journalEntrySchema);

module.exports = JournalEntry;
