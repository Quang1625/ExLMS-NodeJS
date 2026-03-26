const mongoose = require('mongoose');

// Courses
const courseSchema = new mongoose.Schema({
    group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyGroup', required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxLength: 200 },
    description: String,
    thumbnail_key: String,
    start_date: Date,
    end_date: Date,
    start_time: String,
    end_time: String,
    total_sessions: { type: Number, min: 1 },
    schedule_days: String,
    status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'ENDED', 'ARCHIVED'], required: true },
    completion_threshold: { type: Number, min: 0, max: 100, default: 80 },
    has_certificate: { type: Boolean, default: false },
    certificate_key: String,
    order_index: { type: Number, default: 0 },
    chapters: [{
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        title: { type: String, required: true },
        description: String,
        order_index: { type: Number, required: true },
        is_locked: { type: Boolean, default: false },
        unlock_after_chapter: { type: mongoose.Schema.Types.ObjectId },
        lessons: [{
            _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
            title: { type: String, required: true },
            content_type: { type: String, enum: ['VIDEO', 'DOCUMENT', 'EMBED', 'FILE'], required: true },
            content: String,
            resource_key: String,
            duration_seconds: Number,
            order_index: { type: Number, required: true }
        }]
    }]
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Course Enrollments
const courseEnrollmentSchema = new mongoose.Schema({
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    progress_percent: { type: Number, min: 0, max: 100, default: 0 },
    is_completed: { type: Boolean, default: false },
    completed_at: Date,
    enrolled_at: { type: Date, default: Date.now },
    lesson_progress: [{
        lesson_id: { type: mongoose.Schema.Types.ObjectId, required: true },
        is_completed: { type: Boolean, default: false },
        last_position_sec: { type: Number, default: 0 },
        completed_at: Date
    }]
});

const Course = mongoose.model('Course', courseSchema);
const CourseEnrollment = mongoose.model('CourseEnrollment', courseEnrollmentSchema);

module.exports = { Course, CourseEnrollment };
