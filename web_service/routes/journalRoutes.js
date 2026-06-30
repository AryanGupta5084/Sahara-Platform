const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createJournalEntry, getJournalEntries, getJournalStats, deleteMyJournalEntry } = require('../controllers/journalController');

router.use(protect);

router.route('/')
    .post(createJournalEntry)
    .get(getJournalEntries);

router.get('/stats', getJournalStats);
router.delete('/:id', deleteMyJournalEntry);

module.exports = router;