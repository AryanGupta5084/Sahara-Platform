const mongoose = require('mongoose');

const forumCommentSchema = new mongoose.Schema({
    post: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'ForumPost', 
        required: true, 
        index: true 
    },
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    content: { 
        type: String, 
        required: [true, 'Comment content cannot be empty.'], 
        trim: true, 
        maxlength: 2000 
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

forumCommentSchema.index({ post: 1, createdAt: 1 });

const ForumComment = mongoose.model('ForumComment', forumCommentSchema);

module.exports = ForumComment;