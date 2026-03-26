const mongoose = require('mongoose');

// Quizzes
const quizSchema = new mongoose.Schema({
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    chapter_id: { type: mongoose.Schema.Types.ObjectId },
    title: { type: String, required: true },
    description: String,
    time_limit_sec: Number,
    max_attempts: { type: Number, default: 1 },
    passing_score: { type: Number, min: 0, max: 100, default: 70 },
    shuffle_questions: { type: Boolean, default: false },
    result_visibility: { type: String, enum: ['IMMEDIATE', 'AFTER_DEADLINE', 'MANUAL'], default: 'IMMEDIATE' },
    quiz_type: { type: String, enum: ['PRACTICE', 'EXAM'], default: 'PRACTICE' },
    access_code: { type: String, unique: true, sparse: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    questions: [{
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        content: { type: String, required: true },
        question_type: {
            type: String,
            enum: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK', 'SHORT_ANSWER'],
            required: true
        },
        points: { type: Number, required: true, min: 1 },
        media_type: { type: String, enum: ['NONE', 'IMAGE', 'VIDEO'], default: 'NONE' },
        media_url: String,
        video_url: String,
        explanation: String,
        order_index: { type: Number, required: true },
        answers: [{
            _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
            content: { type: String, required: true },
            is_correct: { type: Boolean, required: true },
            order_index: Number
        }]
    }]
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Quiz Attempts
const quizAttemptSchema = new mongoose.Schema({
    quiz_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    score: Number,
    attempt_number: { type: Number, required: true },
    is_passed: Boolean,
    started_at: { type: Date, required: true, default: Date.now },
    submitted_at: Date,
    notes: String,
    responses: [{
        question_id: { type: mongoose.Schema.Types.ObjectId, required: true },
        selected_answer_id: mongoose.Schema.Types.ObjectId,
        text_response: String,
        is_correct: Boolean,
        points_earned: { type: Number, default: 0 }
    }]
});

const Quiz = mongoose.model('Quiz', quizSchema);
const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);

module.exports = { Quiz, QuizAttempt };
