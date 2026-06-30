const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getAllPosts,
    getPostById,
    createPost,
    addComment,
    deleteMyPost,
    deleteMyComment,
    reportPost,
    reportComment
} = require('../controllers/forumController');

router.get('/posts', getAllPosts);
router.get('/posts/:id', getPostById);

router.post('/posts', protect, createPost);
router.post('/posts/:id/comments', protect, addComment);
router.delete('/posts/:id', protect, deleteMyPost);
router.delete('/comments/:id', protect, deleteMyComment);

router.post('/posts/:id/report', protect, reportPost);
router.post('/comments/:id/report', protect, reportComment);

module.exports = router;