const mongoose = require('mongoose');

// Assignments
const assignmentSchema = new mongoose.Schema({
    group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyGroup', required: true },
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: String,
    attachments: [{
        file_name: String,
        file_url: String,
        file_size: Number,
        mimetype: String
    }],
    category: String,
    max_score: { type: Number, required: true, min: 1 },
    assigned_at: { type: Date, required: true, default: Date.now },
    due_at: { type: Date, required: true },
    submission_type: { type: String, enum: ['FILE', 'TEXT', 'URL', 'MIXED'], required: true },
    allowed_file_types: String,
    max_file_size_mb: { type: Number, default: 10 },
    allow_late: { type: Boolean, default: false },
    late_penalty_percent: { type: Number, min: 0, max: 100, default: 0 },
    status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'CLOSED'], required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Assignment Submissions
const assignmentSubmissionSchema = new mongoose.Schema({
    assignment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    submission_type: { type: String, enum: ['FILE', 'TEXT', 'URL', 'MIXED'], required: true },
    text_content: String,
    files: [{
        file_name: String,
        file_url: String,
        file_size: Number,
        mimetype: String
    }],
    external_url: String,
    status: { type: String, enum: ['PENDING', 'SUBMITTED', 'LATE', 'GRADED'], default: 'PENDING' },
    is_late: { type: Boolean, default: false },
    attempt_number: { type: Number, required: true, default: 1 },
    submitted_at: { type: Date, required: true, default: Date.now },
    grade: {
        grader_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        score: { type: Number, min: 0 },
        feedback: String,
        feedback_key: String,
        status: { type: String, enum: ['PENDING', 'GRADED', 'RETURNED'], default: 'PENDING' },
        graded_at: Date
    }
});

const Assignment = mongoose.model('Assignment', assignmentSchema);
const AssignmentSubmission = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);

module.exports = { Assignment, AssignmentSubmission };
