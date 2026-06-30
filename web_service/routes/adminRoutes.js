const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const User = require('../models/User');
const Chat = require('../models/Chat');
const Counselor = require('../models/Counselor');
const ForumPost = require('../models/ForumPost');
const JournalEntry = require('../models/JournalEntry');
const Appointment = require('../models/Appointment');
const ForumComment = require('../models/ForumComment');
const LiveChatMessage = require('../models/LiveChatMessage');

const { protect } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/adminMiddleware');
const { decrypt } = require('../utils/crypto');

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

const { getAdminResources, getAdminResourceById, createResource, updateResource, deleteResource } = require('../controllers/resourceController');
const { getAllCounselors, getCounselorById, createCounselor, updateCounselor, deleteCounselor, getAllAppointmentsForAdmin, updateAppointmentByAdmin, getAvailableUsersForCounselor, getGlobalAnalytics } = require('../controllers/adminController');
const { getAllPostsForAdmin, getPostByIdForAdmin, deletePostByAdmin } = require('../controllers/forumController');

router.use(protect, isAdmin);

router.get('/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;
        const { search } = req.query;
        
        let filter = {};
        if (search) {
            const searchRegex = new RegExp(escapeRegex(search), 'i');
            filter = { $or: [{ username: searchRegex }, { email: searchRegex }] };
        }

        const [users, total] = await Promise.all([
            User.find(filter).select('-password').skip(skip).limit(limit),
            User.countDocuments(filter)
        ]);

        res.status(200).json({ success: true, data: { items: users, total, pages: Math.ceil(total / limit), currentPage: page }, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: 'Server error while fetching users.' });
    }
});

router.get('/users/:id', async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, data: null, error: 'User not found.' });
    }
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, data: null, error: 'User not found.' });
        }
        res.status(200).json({ success: true, data: user, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: 'Server error while fetching user details.' });
    }
});

router.put('/users/:id', async (req, res) => {
    try {
        const { username, email, isAdmin } = req.body;
        const updateData = { username, email, isAdmin };

        if (req.params.id === req.user.id) {
            if (isAdmin === false) {
                return res.status(403).json({ success: false, data: null, error: 'Admins cannot remove their own administrator privileges.' });
            }
            updateData.isAdmin = true;
        }

        const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true }).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, data: null, error: 'User not found.' });
        }
        res.status(200).json({ success: true, data: user, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: 'Server error while updating user.' });
    }
});

router.delete('/users/:id', async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, data: null, error: 'Invalid user ID format.' });
    }
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const userId = req.params.id;
        await Chat.deleteMany({ user: userId }).session(session);
        await JournalEntry.deleteMany({ user: userId }).session(session);
        const counselor = await Counselor.findOne({ user: userId }).session(session);
        if (counselor) {
            await Appointment.deleteMany({ counselor: counselor._id }).session(session);
            await Counselor.findByIdAndDelete(counselor._id).session(session);
        }
        await Appointment.deleteMany({ user: userId }).session(session);
        await LiveChatMessage.deleteMany({ sender: userId }).session(session);
        await User.findByIdAndDelete(userId).session(session);
        await session.commitTransaction();
        session.endSession();
        res.status(200).json({ success: true, data: { message: 'User and all associated data deleted successfully.' }, error: null });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ success: false, data: null, error: 'Server error while deleting user.' });
    }
});

router.get('/chats', async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const skip = (page - 1) * limit;
        const { search } = req.query;

        let matchStage = {};
        if (search) {
            const searchRegex = new RegExp(escapeRegex(search), 'i');
            const searchesForGuest = searchRegex.test('guest');

            if (searchesForGuest) {
                matchStage = {
                    $or: [
                        { 'user.username': searchRegex },
                        { isGuest: true }
                    ]
                };
            } else {
                matchStage = { 'user.username': searchRegex };
            }
        }
        const pipeline = [
            { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'user' } },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            { $match: matchStage },
            { $sort: { createdAt: -1 } }
        ];

        const chatsPipeline = [ ...pipeline, { $skip: skip }, { $limit: limit } ];
        const totalPipeline = [ ...pipeline, { $count: 'total' } ];
        
        let chats = await Chat.aggregate(chatsPipeline);
        const totalResult = await Chat.aggregate(totalPipeline);
        const total = totalResult.length > 0 ? totalResult.total : 0;

        chats = chats.map(chat => {
            let decryptedMessage = '';
            if (chat.message && typeof chat.message === 'string' && chat.message.includes(':')) {
                try {
                    decryptedMessage = decrypt(chat.message);
                } catch (e) {
                    decryptedMessage = '[Could not load message]';
                }
            }
            return { ...chat, message: decryptedMessage };
        });

        res.status(200).json({
            success: true,
            data: { items: chats, total, pages: Math.ceil(total / limit), currentPage: page },
            error: null
        });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: 'Server error while fetching chats.' });
    }
});

router.get('/chats/:id', async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, data: null, error: 'Invalid chat ID format.' });
    }
    try {
        const chat = await Chat.findById(req.params.id).populate('user', 'username email');
        if (!chat) {
            return res.status(404).json({ success: false, data: null, error: 'Chat not found.' });
        }
        const decryptedChat = chat.toObject();
        res.status(200).json({ success: true, data: decryptedChat, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: 'Server error while fetching chat details.' });
    }
});

router.put('/chats/:id', async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, data: null, error: 'Invalid chat ID format.' });
    }
    try {
        let { flag, sentiment } = req.body;
        const allowedFlags = ['anxiety', 'depression', 'neutral', 'stress', 'suicidal', null];

        if (flag === '') flag = null;
        if (flag && !allowedFlags.includes(flag)) {
            return res.status(400).json({ success: false, data: null, error: 'Invalid flag value.' });
        }

        const chat = await Chat.findByIdAndUpdate(req.params.id, { flag, sentiment }, { new: true, runValidators: true }).populate('user', 'username email');
        if (!chat) {
            return res.status(404).json({ success: false, data: null, error: 'Chat not found.' });
        }
        res.status(200).json({ success: true, data: chat, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: 'Server error while updating chat.' });
    }
});

router.delete('/chats/:id', async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ success: false, data: null, error: 'Invalid chat ID format.' });
    }
    try {
        const chat = await Chat.findById(req.params.id);
        if (!chat) {
            return res.status(404).json({ success: false, data: null, error: 'Chat not found.' });
        }
        await Chat.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, data: { message: "Chat deleted successfully." }, error: null });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: 'Server error while deleting chat.' });
    }
});

router.route('/resources')
    .get(getAdminResources)
    .post(createResource);

router.route('/resources/:id')
    .get(getAdminResourceById)
    .put(updateResource)
    .delete(deleteResource);

router.route('/counselors')
    .get(getAllCounselors)
    .post(createCounselor);

router.route('/counselors/:id')
    .get(getCounselorById)
    .put(updateCounselor)
    .delete(deleteCounselor);

router.get('/available-users', getAvailableUsersForCounselor);

router.get('/appointments', getAllAppointmentsForAdmin);
router.put('/appointments/:id', updateAppointmentByAdmin);

router.get('/forum/posts', getAllPostsForAdmin);
router.route('/forum/posts/:id')
    .get(getPostByIdForAdmin)
    .delete(deletePostByAdmin);

router.get('/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ isGuest: false });
        const totalChats = await Chat.countDocuments();
        const newUsers = await User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 *24* 60 *60* 1000) }, isGuest: false });
        const newChats = await Chat.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 *24* 60 *60* 1000) } });
        
        res.status(200).json({
            success: true,
            data: { totalUsers, totalChats, newUsers, newChats },
            error: null
        });
    } catch (error) {
        res.status(500).json({ success: false, data: null, error: 'Server error while fetching stats.' });
    }
});

router.get('/analytics', getGlobalAnalytics);

module.exports = router;