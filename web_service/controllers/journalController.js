const JournalEntry = require('../models/JournalEntry');
const User = require('../models/User');
const axios = require('axios');
const mongoose = require('mongoose');

async function analyzeJournalSentiment(text) {
    try {
        const response = await axios.post(process.env.SENTIMENT_SERVICE_URL, { text });
        return response.data.emotion;
    } catch (error) {
        console.error('Journal sentiment analysis error:', error.message);
        return null;
    }
}

async function recalculateStreak(user) {
    const entries = await JournalEntry.find({ user: user._id }).sort({ entryDate: 'asc' });

    if (entries.length === 0) {
        user.journalStreak = 0;
        user.lastJournalDate = null;
        await user.save();
        return;
    }

    let currentStreak = 0;
    let lastEntryDate = null;

    for (const entry of entries) {
        if (lastEntryDate) {
            const diffTime = entry.entryDate.getTime() - lastEntryDate.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                currentStreak++;
            } else if (diffDays > 1) {
                currentStreak = 1;
            }
        } else {
            currentStreak = 1;
        }
        lastEntryDate = entry.entryDate;
    }

    user.journalStreak = currentStreak;
    user.lastJournalDate = lastEntryDate;

    let updatedAchievements = [...(user.achievements || [])];

    if (currentStreak < 30) {
        updatedAchievements = updatedAchievements.filter(ach => ach !== '30-day-streak');
    }
    if (currentStreak < 7) {
        updatedAchievements = updatedAchievements.filter(ach => ach !== '7-day-streak');
    }

    user.achievements = updatedAchievements;
    await user.save();
}

exports.createJournalEntry = async (req, res) => {
    try {
        const { mood, content } = req.body;
        const userId = req.user.id;
        const user = await User.findById(userId);

        const entryDate = new Date();
        entryDate.setHours(0, 0, 0, 0);

        const analyzedSentiment = await analyzeJournalSentiment(content);

        const newEntry = await JournalEntry.create({
            user: userId,
            mood,
            content,
            analyzedSentiment,
            entryDate
        });

        await recalculateStreak(user);

        res.status(201).json({ success: true, data: newEntry, error: null });
    } catch (error) {
        console.error("Failed to create journal entry:", error);
        if (error.code === 11000) {
            return res.status(409).json({ success: false, data: null, error: 'An entry for this date already exists.' });
        }
        res.status(400).json({ success: false, data: null, error: 'Failed to create journal entry.' });
    }
};

exports.getJournalEntries = async (req, res) => {
    try {
        const entries = await JournalEntry.find({ user: req.user.id }).sort({ entryDate: -1 });
        res.status(200).json({ success: true, data: entries, error: null });
    } catch (error) {
        console.error("Failed to fetch journal entries:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error fetching journal entries.' });
    }
};

exports.getJournalStats = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const stats = await JournalEntry.aggregate([
            { $match: { user: userId } },
            { $group: { _id: '$mood', count: { $sum: 1 } } }
        ]);
        res.status(200).json({ success: true, data: stats, error: null });
    } catch (error) {
        console.error("Journal stats error:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error fetching journal statistics.' });
    }
};

exports.deleteMyJournalEntry = async (req, res) => {
    try {
        const entryId = req.params.id;
        const userId = req.user.id;
        
        const entry = await JournalEntry.findOneAndDelete({ _id: entryId, user: userId });
        if (!entry) {
            return res.status(404).json({ success: false, data: null, error: 'Entry not found or unauthorized.' });
        }

        const user = await User.findById(userId);
        await recalculateStreak(user);

        res.status(200).json({ success: true, data: { message: 'Entry deleted successfully' }, error: null });
    } catch (error) {
        console.error("Failed to delete journal entry:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error while deleting entry.' });
    }
};