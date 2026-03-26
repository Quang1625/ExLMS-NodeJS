const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
    group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyGroup', required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: String,
    meeting_type: { type: String, enum: ['VIDEO_CONFERENCE', 'WEBINAR', 'RECORDING_ONLY'], required: true },
    platform: String,
    join_url: String,
    passcode: String,
    recording_key: String,
    start_at: { type: Date, required: true },
    duration_minutes: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED'], default: 'SCHEDULED' },
    attendances: [{
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        joined_at: { type: Date, required: true },
        left_at: Date,
        duration_sec: { type: Number, default: 0 },
        is_present: { type: Boolean, default: true }
    }],
    polls: [{
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        question: { type: String, required: true },
        is_active: { type: Boolean, default: true },
        options: [{
            _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
            label: { type: String, required: true },
            vote_count: { type: Number, default: 0 },
            voters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
        }]
    }]
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Meeting', meetingSchema);
