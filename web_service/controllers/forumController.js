const ForumPost = require('../models/ForumPost');
const ForumComment = require('../models/ForumComment');

function escapeRegex(text) {
    if (!text) return '';
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

exports.getAllPosts = async (req, res) => {
    try {
        const posts = await ForumPost.find()
            .populate('user', 'username')
            .sort({ createdAt: -1 });
        
        const sanitizedPosts = posts.map(post => {
            const postObj = post.toObject();
            if (postObj.isAnonymous && postObj.user) {
                postObj.user.username = 'Anonymous';
            }
            return postObj;
        });

        res.status(200).json({ success: true, data: sanitizedPosts, error: null });
    } catch (error) {
        console.error("Failed to fetch forum posts:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error fetching posts.' });
    }
};

exports.getPostById = async (req, res) => {
    try {
        const post = await ForumPost.findById(req.params.id).populate('user', 'username');
        if (!post) {
            return res.status(404).json({ success: false, data: null, error: 'Post not found.' });
        }
        
        const comments = await ForumComment.find({ post: req.params.id })
            .populate('user', 'username')
            .sort({ createdAt: 1 });
        
        const postObj = post.toObject();
        if (postObj.isAnonymous && postObj.user) {
            postObj.user.username = 'Anonymous';
        }

        const sanitizedComments = comments.map(comment => {
            const commentObj = comment.toObject();
            if (commentObj.isAnonymous && commentObj.user) {
                commentObj.user.username = 'Anonymous';
            }
            return commentObj;
        });

        res.status(200).json({ success: true, data: { post: postObj, comments: sanitizedComments }, error: null });
    } catch (error) {
        console.error("Failed to fetch post by ID:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error fetching post.' });
    }
};

exports.createPost = async (req, res) => {
    try {
        const { title, content, isAnonymous, tags } = req.body;
        const userId = req.user.id;
        
        const post = await ForumPost.create({
            user: userId,
            title,
            content,
            isAnonymous,
            tags: tags || []
        });
        
        res.status(201).json({ success: true, data: post, error: null });
    } catch (error) {
        console.error("Failed to create post:", error);
        res.status(400).json({ success: false, data: null, error: 'Failed to create post. Please check input.' });
    }
};

exports.addComment = async (req, res) => {
    try {
        const { content, isAnonymous } = req.body;
        const postId = req.params.id;
        const userId = req.user.id;

        const comment = await ForumComment.create({
            post: postId,
            user: userId,
            content,
            isAnonymous
        });

        res.status(201).json({ success: true, data: comment, error: null });
    } catch (error) {
        console.error("Failed to add comment:", error);
        res.status(400).json({ success: false, data: null, error: 'Failed to add comment.' });
    }
};

exports.deleteMyPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;
        
        const post = await ForumPost.findOne({ _id: postId, user: userId });
        if (!post) {
            return res.status(404).json({ success: false, data: null, error: 'Post not found or unauthorized.' });
        }

        await ForumComment.deleteMany({ post: postId });
        await ForumPost.deleteOne({ _id: postId });

        res.status(200).json({ success: true, data: { message: 'Post deleted.' }, error: null });
    } catch (error) {
        console.error("Failed to delete post:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error deleting post.' });
    }
};

exports.deleteMyComment = async (req, res) => {
    try {
        const commentId = req.params.id;
        const userId = req.user.id;

        const comment = await ForumComment.findOneAndDelete({ _id: commentId, user: userId });
        if (!comment) {
            return res.status(404).json({ success: false, data: null, error: 'Comment not found or unauthorized.' });
        }

        res.status(200).json({ success: true, data: { message: 'Comment deleted.' }, error: null });
    } catch (error) {
        console.error("Failed to delete comment:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error deleting comment.' });
    }
};

exports.getAllPostsForAdmin = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;
        const { search } = req.query;
        
        let filter = {};
        if (search) {
            const searchRegex = new RegExp(escapeRegex(search), 'i');
            filter = { $or: [{ title: searchRegex }, { content: searchRegex }] };
        }

        const [posts, total] = await Promise.all([
            ForumPost.find(filter).populate('user', 'username email').sort({ createdAt: -1 }).skip(skip).limit(limit),
            ForumPost.countDocuments(filter)
        ]);

        res.status(200).json({
            success: true,
            data: { items: posts, total, pages: Math.ceil(total / limit), currentPage: page },
            error: null
        });
    } catch (error) {
        console.error("Admin failed to fetch forum posts:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error fetching posts.' });
    }
};

exports.getPostByIdForAdmin = async (req, res) => {
    try {
        const post = await ForumPost.findById(req.params.id).populate('user', 'username email');
        if (!post) {
            return res.status(404).json({ success: false, data: null, error: 'Post not found.' });
        }
        
        const comments = await ForumComment.find({ post: req.params.id }).populate('user', 'username email').sort({ createdAt: 1 });
        res.status(200).json({ success: true, data: { post, comments }, error: null });
    } catch (error) {
        console.error("Admin failed to fetch single post:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error fetching post.' });
    }
};

exports.deletePostByAdmin = async (req, res) => {
    try {
        const postId = req.params.id;
        const post = await ForumPost.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, data: null, error: 'Post not found.' });
        }
        
        await ForumComment.deleteMany({ post: postId });
        await ForumPost.findByIdAndDelete(postId);
        
        res.status(200).json({ success: true, data: { message: 'Post and comments deleted.' }, error: null });
    } catch (error) {
        console.error("Admin failed to delete post:", error);
        res.status(500).json({ success: false, data: null, error: 'Server error deleting post.' });
    }
};

exports.reportPost = async (req, res) => {
    try {
        const post = await ForumPost.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found.' });
        }
        
        if (!post.reports.includes(req.user.id)) {
            post.reports.push(req.user.id);
            await post.save();
        }
        res.status(200).json({ success: true, data: { message: 'Post reported successfully.' } });
    } catch (error) {
        console.error("Failed to report post:", error);
        res.status(500).json({ success: false, error: 'Server error while reporting post.' });
    }
};

exports.reportComment = async (req, res) => {
    try {
        const comment = await ForumComment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ success: false, error: 'Comment not found.' });
        }
        
        if (!comment.reports.includes(req.user.id)) {
            comment.reports.push(req.user.id);
            await comment.save();
        }
        res.status(200).json({ success: true, data: { message: 'Comment reported successfully.' } });
    } catch (error) {
        console.error("Failed to report comment:", error);
        res.status(500).json({ success: false, error: 'Server error while reporting comment.' });
    }
};