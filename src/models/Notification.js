const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    body: String,
    type: {
        type: String,
        required: true,
        enum: [
            'JOIN_REQUEST', 'JOIN_APPROVED', 'JOIN_REJECTED',
            'NEW_ASSIGNMENT', 'ASSIGNMENT_DUE_SOON', 'ASSIGNMENT_GRADED',
            'NEW_MEETING', 'MEETING_STARTING_SOON',
            'NEW_COURSE', 'FORUM_REPLY', 'MENTION', 'CONTENT_REPORTED', 'SYSTEM'
        ]
    },
    action_url: String,
    source: {
        entity_id: mongoose.Schema.Types.ObjectId,
        entity_type: String
    },
    is_read: { type: Boolean, default: false },
    read_at: Date
}, { timestamps: { createdAt: 'created_at' } });

module.exports = mongoose.model('Notification', notificationSchema);
