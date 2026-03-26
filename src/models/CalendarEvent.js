const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: String,
    start_at: { type: Date, required: true },
    end_at: Date,
    event_type: {
        type: String,
        enum: ['MEETING', 'ASSIGNMENT_DUE', 'QUIZ', 'COURSE_START', 'COURSE_END', 'PERSONAL', 'SYSTEM'],
        required: true
    },
    color: { type: String, default: '#3788d8' },
    source: {
        entity_id: mongoose.Schema.Types.ObjectId,
        entity_type: { type: String, enum: ['MEETING', 'ASSIGNMENT', 'QUIZ', 'COURSE'] }
    },
    is_personal: { type: Boolean, default: false },
    reminder_at: Date
}, { timestamps: { createdAt: 'created_at' } });

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);
