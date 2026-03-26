const mongoose = require('mongoose');

// Forum Tags
const forumTagSchema = new mongoose.Schema({
    name: { type: String, required: true, maxLength: 60 },
    slug: { type: String, required: true, maxLength: 80 },
    description: String,
    color: { type: String, required: true, match: /^#[0-9A-Fa-f]{6}$/ },
    post_count: { type: Number, default: 0 },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: { createdAt: 'created_at' } });

// Forum Posts
const forumPostSchema = new mongoose.Schema({
    author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxLength: 200 },
    content: { type: String, required: true },
    status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'HIDDEN', 'DELETED'], required: true },
    view_count: { type: Number, default: 0 },
    upvote_count: { type: Number, default: 0 },
    is_pinned: { type: Boolean, default: false },
    is_closed: { type: Boolean, default: false },
    edited_at: Date,
    tag_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ForumTag' }],
    attachments: [{
        filename: { type: String, required: true },
        object_key: { type: String, required: true },
        file_size: { type: Number, required: true },
        mime_type: { type: String, required: true },
        created_at: { type: Date, default: Date.now }
    }]
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Forum Comments
const forumCommentSchema = new mongoose.Schema({
    post_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumPost', required: true },
    author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumComment' },
    content: { type: String, required: true },
    upvote_count: { type: Number, default: 0 },
    is_accepted: { type: Boolean, default: false }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Forum Votes
const forumVoteSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    target_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    target_type: { type: String, enum: ['FORUM_POST', 'FORUM_COMMENT'], required: true },
    vote_type: { type: String, enum: ['UPVOTE', 'DOWNVOTE', 'LIKE', 'HEART', 'WOW', 'SAD', 'LAUGH'], required: true }
}, { timestamps: { createdAt: 'created_at' } });

// Forum Saved Posts
const forumSavedPostSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    post_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumPost', required: true },
    saved_at: { type: Date, default: Date.now }
});

const ForumTag = mongoose.model('ForumTag', forumTagSchema);
const ForumPost = mongoose.model('ForumPost', forumPostSchema);
const ForumComment = mongoose.model('ForumComment', forumCommentSchema);
const ForumVote = mongoose.model('ForumVote', forumVoteSchema);
const ForumSavedPost = mongoose.model('ForumSavedPost', forumSavedPostSchema);

module.exports = { ForumTag, ForumPost, ForumComment, ForumVote, ForumSavedPost };
