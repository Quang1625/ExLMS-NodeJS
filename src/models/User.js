const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    student_code: { type: String, unique: true, sparse: true },
    password_hash: String,
    full_name: { type: String, required: true, maxLength: 150 },
    avatar_key: String,
    bio: String,
    role: { type: String, enum: ['ADMIN', 'INSTRUCTOR', 'STUDENT'], required: true },
    status: { type: String, enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'DELETED'], required: true },
    email_verified: { type: Boolean, required: true, default: false },
    verification_token: String,
    reset_token: String,
    reset_token_expires: Date,
    failed_login_count: { type: Number, default: 0 },
    locked_until: Date,
    last_login_at: Date,
    oauth_accounts: [{
        provider: { type: String, enum: ['google', 'microsoft'] },
        provider_id: String,
        access_token: String,
        created_at: { type: Date, default: Date.now }
    }],
    notification_settings: {
        new_assignment: { type: Boolean, default: true },
        assignment_graded: { type: Boolean, default: true },
        assignment_due_soon: { type: Boolean, default: true },
        new_meeting: { type: Boolean, default: true },
        meeting_starting_soon: { type: Boolean, default: true },
        new_course: { type: Boolean, default: true },
        new_forum_post: { type: Boolean, default: true },
        forum_reply: { type: Boolean, default: true },
        mention: { type: Boolean, default: true },
        group_join_request: { type: Boolean, default: true },
        email_enabled: { type: Boolean, default: true }
    },
    sessions: [{
        refresh_token: { type: String, required: true },
        ip_address: String,
        user_agent: String,
        expires_at: { type: Date, required: true },
        created_at: { type: Date, default: Date.now }
    }]
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('User', userSchema);
