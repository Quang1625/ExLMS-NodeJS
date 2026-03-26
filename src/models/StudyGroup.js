const mongoose = require('mongoose');

// Study Groups
const studyGroupSchema = new mongoose.Schema({
    owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, maxLength: 150 },
    description: String,
    cover_key: String,
    visibility: { type: String, enum: ['PUBLIC', 'PRIVATE'], required: true },
    invite_code: { type: String, unique: true, sparse: true },
    max_members: { type: Number, default: 50 },
    member_count: { type: Number, default: 0 },
    category: String,
    language: { type: String, default: 'en' },
    status: { type: String, enum: ['ACTIVE', 'ARCHIVED', 'DELETED'], required: true },
    members: [{
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['OWNER', 'EDITOR', 'MEMBER'], required: true },
        status: { type: String, enum: ['ACTIVE', 'BANNED'], required: true },
        approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        joined_at: { type: Date, default: Date.now }
    }],
    join_requests: [{
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        message: String,
        status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], required: true },
        reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        created_at: { type: Date, default: Date.now },
        reviewed_at: Date
    }]
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Group Feed Posts
const groupFeedPostSchema = new mongoose.Schema({
    group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyGroup', required: true },
    author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    linked_entity: {
        entity_id: mongoose.Schema.Types.ObjectId,
        entity_type: { type: String, enum: ['COURSE', 'CHAPTER', 'LESSON', 'ASSIGNMENT', 'MEETING', 'QUIZ'] }
    },
    is_pinned: { type: Boolean, default: false },
    reaction_count: { type: Number, default: 0 },
    comment_count: { type: Number, default: 0 },
    reactions: [{
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        emoji: { type: String, required: true },
        created_at: { type: Date, default: Date.now }
    }]
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Group Feed Comments
const groupFeedCommentSchema = new mongoose.Schema({
    feed_post_id: { type: mongoose.Schema.Types.ObjectId, ref: 'GroupFeedPost', required: true },
    author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true }
}, { timestamps: { createdAt: 'created_at' } });

const StudyGroup = mongoose.model('StudyGroup', studyGroupSchema);
const GroupFeedPost = mongoose.model('GroupFeedPost', groupFeedPostSchema);
const GroupFeedComment = mongoose.model('GroupFeedComment', groupFeedCommentSchema);

module.exports = { StudyGroup, GroupFeedPost, GroupFeedComment };
