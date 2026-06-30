const mongoose = require('mongoose');

const forumPostSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    title: { 
        type: String, 
        required: [true, 'A title is required for the post.'], 
        trim: true, 
        maxlength: 150 
    },
    content: { 
        type: String, 
        required: [true, 'Content is required for the post.'], 
        trim: true, 
        maxlength: 5000 
    },
    tags: { 
        type: [String], 
        default: [] 
    },
    isAnonymous: { 
        type: Boolean, 
        default: false 
    },
    reports: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }]
}, { 
    timestamps: true 
});

forumPostSchema.index({ user: 1, createdAt: -1 });

const ForumPost = mongoose.model('ForumPost', forumPostSchema);

module.exports = ForumPost;