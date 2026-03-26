const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');


const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ExLMS')
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => {
    console.error('❌ Could not connect to MongoDB', err);
    process.exit(1);
});

// =============================================================================
// MODELS (based on your schema)
// =============================================================================

// User Model
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
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

// Forum Tags Model
const forumTagSchema = new mongoose.Schema({
    name: { type: String, required: true, maxLength: 60 },
    slug: { type: String, required: true, maxLength: 80 },
    description: String,
    color: { type: String, required: true, match: /^#[0-9A-Fa-f]{6}$/ },
    post_count: { type: Number, default: 0 },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: { createdAt: 'created_at' } });

// Forum Posts Model
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

// Study Groups Model
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

// Courses Model
const courseSchema = new mongoose.Schema({
    group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyGroup', required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxLength: 200 },
    description: String,
    thumbnail_key: String,
    start_date: Date,
    end_date: Date,
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

// Course Enrollments Model
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

// Quizzes Model
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
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    questions: [{
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        content: { type: String, required: true },
        question_type: { type: String, enum: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK', 'SHORT_ANSWER'], required: true },
        points: { type: Number, required: true, min: 1 },
        explanation: String,
        media_type: { type: String, enum: ['NONE', 'IMAGE', 'VIDEO'], default: 'NONE' },
        media_url: String,
        order_index: { type: Number, required: true },
        answers: [{
            _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
            content: { type: String, required: true },
            is_correct: { type: Boolean, required: true },
            order_index: Number
        }]
    }]
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Quiz Attempts Model
const quizAttemptSchema = new mongoose.Schema({
    quiz_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    score: Number,
    attempt_number: { type: Number, required: true },
    is_passed: Boolean,
    started_at: { type: Date, required: true, default: Date.now },
    submitted_at: Date,
    responses: [{
        question_id: { type: mongoose.Schema.Types.ObjectId, required: true },
        selected_answer_id: mongoose.Schema.Types.ObjectId,
        text_response: String,
        is_correct: Boolean,
        points_earned: { type: Number, default: 0 }
    }]
});

// Assignments Model
const assignmentSchema = new mongoose.Schema({
    group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyGroup', required: true },
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: String,
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

// Assignment Submissions Model
const assignmentSubmissionSchema = new mongoose.Schema({
    assignment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    submission_type: { type: String, enum: ['FILE', 'TEXT', 'URL', 'MIXED'], required: true },
    text_content: String,
    file_key: String,
    file_name: String,
    file_size: Number,
    external_url: String,
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

// Meetings Model
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

// Calendar Events Model
const calendarEventSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: String,
    start_at: { type: Date, required: true },
    end_at: Date,
    event_type: { type: String, enum: ['MEETING', 'ASSIGNMENT_DUE', 'QUIZ', 'COURSE_START', 'COURSE_END', 'PERSONAL', 'SYSTEM'], required: true },
    color: { type: String, default: '#3788d8' },
    source: {
        entity_id: mongoose.Schema.Types.ObjectId,
        entity_type: { type: String, enum: ['MEETING', 'ASSIGNMENT', 'QUIZ', 'COURSE'] }
    },
    is_personal: { type: Boolean, default: false },
    reminder_at: Date
}, { timestamps: { createdAt: 'created_at' } });

// Notifications Model
const notificationSchema = new mongoose.Schema({
    recipient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    body: String,
    type: { type: String, required: true, enum: [
        'JOIN_REQUEST', 'JOIN_APPROVED', 'JOIN_REJECTED',
        'NEW_ASSIGNMENT', 'ASSIGNMENT_DUE_SOON', 'ASSIGNMENT_GRADED',
        'NEW_MEETING', 'MEETING_STARTING_SOON',
        'NEW_COURSE', 'FORUM_REPLY', 'MENTION', 'CONTENT_REPORTED', 'SYSTEM'
    ]},
    action_url: String,
    source: {
        entity_id: mongoose.Schema.Types.ObjectId,
        entity_type: String
    },
    is_read: { type: Boolean, default: false },
    read_at: Date
}, { timestamps: { createdAt: 'created_at' } });

// Create models
const User = mongoose.model('User', userSchema);
const ForumTag = mongoose.model('ForumTag', forumTagSchema);
const ForumPost = mongoose.model('ForumPost', forumPostSchema);
const ForumComment = mongoose.model('ForumComment', new mongoose.Schema({
    post_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumPost', required: true },
    author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumComment' },
    content: { type: String, required: true },
    upvote_count: { type: Number, default: 0 },
    is_accepted: { type: Boolean, default: false }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }));
const ForumVote = mongoose.model('ForumVote', new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    target_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    target_type: { type: String, enum: ['FORUM_POST', 'FORUM_COMMENT'], required: true },
    vote_type: { type: String, enum: ['UPVOTE', 'DOWNVOTE'], required: true }
}, { timestamps: { createdAt: 'created_at' } }));
const ForumSavedPost = mongoose.model('ForumSavedPost', new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    post_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ForumPost', required: true },
    saved_at: { type: Date, default: Date.now }
}));
const StudyGroup = mongoose.model('StudyGroup', studyGroupSchema);
const GroupFeedPost = mongoose.model('GroupFeedPost', new mongoose.Schema({
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
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }));
const GroupFeedComment = mongoose.model('GroupFeedComment', new mongoose.Schema({
    feed_post_id: { type: mongoose.Schema.Types.ObjectId, ref: 'GroupFeedPost', required: true },
    author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true }
}, { timestamps: { createdAt: 'created_at' } }));
const Course = mongoose.model('Course', courseSchema);
const CourseEnrollment = mongoose.model('CourseEnrollment', courseEnrollmentSchema);
const Quiz = mongoose.model('Quiz', quizSchema);
const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);
const Assignment = mongoose.model('Assignment', assignmentSchema);
const AssignmentSubmission = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);
const Meeting = mongoose.model('Meeting', meetingSchema);
const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);
const Notification = mongoose.model('Notification', notificationSchema);

// =============================================================================
// ROUTES
// =============================================================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date(),
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// User Routes
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find().select('-password_hash -sessions');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password_hash -sessions');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        ).select('-password_hash -sessions');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Study Groups Routes
app.get('/api/study-groups', async (req, res) => {
    try {
        const groups = await StudyGroup.find({ status: 'ACTIVE' })
            .populate('owner_id', 'full_name email');
        res.json(groups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/study-groups/:id', async (req, res) => {
    try {
        const group = await StudyGroup.findById(req.params.id)
            .populate('owner_id', 'full_name email')
            .populate('members.user_id', 'full_name email avatar_key');
        if (!group) return res.status(404).json({ error: 'Group not found' });
        res.json(group);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/study-groups', async (req, res) => {
    try {
        const group = new StudyGroup(req.body);
        await group.save();
        res.status(201).json(group);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/study-groups/:id/members', async (req, res) => {
    try {
        const { user_id, role } = req.body;
        const group = await StudyGroup.findById(req.params.id);
        if (!group) return res.status(404).json({ error: 'Group not found' });
        
        group.members.push({
            user_id,
            role: role || 'MEMBER',
            status: 'ACTIVE',
            joined_at: new Date()
        });
        group.member_count = group.members.length;
        
        await group.save();
        res.json(group);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Courses Routes
app.get('/api/courses', async (req, res) => {
    try {
        const { group_id, status } = req.query;
        const filter = {};
        if (group_id) filter.group_id = group_id;
        if (status) filter.status = status;
        
        const courses = await Course.find(filter)
            .populate('created_by', 'full_name email')
            .populate('group_id', 'name');
        res.json(courses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/courses/:id', async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('created_by', 'full_name email')
            .populate('group_id', 'name');
        if (!course) return res.status(404).json({ error: 'Course not found' });
        res.json(course);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/courses', async (req, res) => {
    try {
        const course = new Course(req.body);
        await course.save();
        res.status(201).json(course);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/courses/:id', async (req, res) => {
    try {
        const course = await Course.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );
        if (!course) return res.status(404).json({ error: 'Course not found' });
        res.json(course);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Course Enrollment Routes
app.get('/api/enrollments', async (req, res) => {
    try {
        const { user_id, course_id } = req.query;
        const filter = {};
        if (user_id) filter.user_id = user_id;
        if (course_id) filter.course_id = course_id;
        
        const enrollments = await CourseEnrollment.find(filter)
            .populate('user_id', 'full_name email')
            .populate('course_id', 'title');
        res.json(enrollments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/enrollments', async (req, res) => {
    try {
        const enrollment = new CourseEnrollment(req.body);
        await enrollment.save();
        res.status(201).json(enrollment);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/enrollments/:id/progress', async (req, res) => {
    try {
        const { lesson_id, is_completed, last_position_sec } = req.body;
        const enrollment = await CourseEnrollment.findById(req.params.id);
        if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
        
        const lessonProgress = enrollment.lesson_progress.find(
            lp => lp.lesson_id.toString() === lesson_id
        );
        
        if (lessonProgress) {
            if (is_completed !== undefined) lessonProgress.is_completed = is_completed;
            if (last_position_sec !== undefined) lessonProgress.last_position_sec = last_position_sec;
            if (is_completed && !lessonProgress.completed_at) {
                lessonProgress.completed_at = new Date();
            }
        } else {
            enrollment.lesson_progress.push({
                lesson_id,
                is_completed: is_completed || false,
                last_position_sec: last_position_sec || 0,
                completed_at: is_completed ? new Date() : null
            });
        }
        
        // Calculate overall progress
        const totalLessons = await getTotalLessonsInCourse(enrollment.course_id);
        const completedLessons = enrollment.lesson_progress.filter(lp => lp.is_completed).length;
        enrollment.progress_percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
        
        if (enrollment.progress_percent >= 100) {
            enrollment.is_completed = true;
            enrollment.completed_at = new Date();
        }
        
        await enrollment.save();
        res.json(enrollment);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Helper function
async function getTotalLessonsInCourse(courseId) {
    const course = await Course.findById(courseId);
    if (!course) return 0;
    return course.chapters.reduce((total, chapter) => total + (chapter.lessons?.length || 0), 0);
}

// Quiz Routes
app.get('/api/quizzes', async (req, res) => {
    try {
        const { course_id, chapter_id } = req.query;
        const filter = {};
        if (course_id) filter.course_id = course_id;
        if (chapter_id) filter.chapter_id = chapter_id;
        
        const quizzes = await Quiz.find(filter);
        res.json(quizzes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/quizzes/:id', async (req, res) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
        res.json(quiz);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/quizzes', async (req, res) => {
    try {
        const quiz = new Quiz(req.body);
        await quiz.save();
        res.status(201).json(quiz);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/quizzes/:id', async (req, res) => {
    try {
        const quiz = await Quiz.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
        res.json(quiz);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/quizzes/:id/attempts', async (req, res) => {
    try {
        const { user_id, responses } = req.body;
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
        
        // Get attempt number
        const previousAttempts = await QuizAttempt.countDocuments({
            quiz_id: req.params.id,
            user_id
        });
        
        const attemptNumber = previousAttempts + 1;
        
        // Check max attempts
        if (attemptNumber > quiz.max_attempts) {
            return res.status(400).json({ error: 'Maximum attempts exceeded' });
        }
        
        const attempt = new QuizAttempt({
            quiz_id: req.params.id,
            user_id,
            attempt_number: attemptNumber,
            responses: []
        });
        
        // Grade the attempt
        let totalScore = 0;
        let maxScore = 0;
        
        for (const response of responses) {
            const question = quiz.questions.id(response.question_id);
            if (!question) continue;
            
            maxScore += question.points;
            
            let isCorrect = false;
            let pointsEarned = 0;
            
            if (question.question_type === 'SINGLE_CHOICE' || question.question_type === 'TRUE_FALSE') {
                const correctAnswer = question.answers.find(a => a.is_correct);
                isCorrect = correctAnswer && correctAnswer._id.toString() === response.selected_answer_id;
                pointsEarned = isCorrect ? question.points : 0;
            } else if (question.question_type === 'MULTIPLE_CHOICE') {
                // For multiple choice, all correct answers must be selected
                const correctAnswers = question.answers.filter(a => a.is_correct).map(a => a._id.toString());
                const selectedAnswers = response.selected_answer_ids || [];
                
                const allCorrectSelected = correctAnswers.every(id => selectedAnswers.includes(id));
                const noIncorrectSelected = selectedAnswers.every(id => correctAnswers.includes(id));
                
                isCorrect = allCorrectSelected && noIncorrectSelected;
                pointsEarned = isCorrect ? question.points : 0;
            } else if (question.question_type === 'FILL_BLANK' || question.question_type === 'SHORT_ANSWER') {
                // Manual grading for these types
                pointsEarned = 0; // Will be graded later
            }
            
            attempt.responses.push({
                question_id: response.question_id,
                selected_answer_id: response.selected_answer_id,
                text_response: response.text_response,
                is_correct: isCorrect,
                points_earned: pointsEarned
            });
            
            totalScore += pointsEarned;
        }
        
        attempt.score = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
        attempt.is_passed = attempt.score >= quiz.passing_score;
        attempt.submitted_at = new Date();
        
        await attempt.save();
        
        res.status(201).json({
            attempt,
            result: {
                score: attempt.score,
                passed: attempt.is_passed,
                maxScore,
                earnedScore: totalScore
            }
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Assignment Routes
app.get('/api/assignments', async (req, res) => {
    try {
        const { group_id, course_id, status } = req.query;
        const filter = {};
        if (group_id) filter.group_id = group_id;
        if (course_id) filter.course_id = course_id;
        if (status) filter.status = status;
        
        const assignments = await Assignment.find(filter)
            .populate('created_by', 'full_name email')
            .populate('group_id', 'name');
        res.json(assignments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/assignments', async (req, res) => {
    try {
        const assignment = new Assignment(req.body);
        await assignment.save();
        res.status(201).json(assignment);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/assignments/:id/submissions', async (req, res) => {
    try {
        const { student_id, submission_type, text_content, file_key, file_name, file_size, external_url } = req.body;
        
        // Get submission count for attempt number
        const previousSubmissions = await AssignmentSubmission.countDocuments({
            assignment_id: req.params.id,
            student_id
        });
        
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
        
        const isLate = new Date() > assignment.due_at;
        
        const submission = new AssignmentSubmission({
            assignment_id: req.params.id,
            student_id,
            submission_type,
            text_content,
            file_key,
            file_name,
            file_size,
            external_url,
            is_late: isLate,
            attempt_number: previousSubmissions + 1
        });
        
        await submission.save();
        res.status(201).json(submission);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/submissions/:id/grade', async (req, res) => {
    try {
        const { grader_id, score, feedback, feedback_key, status } = req.body;
        
        const submission = await AssignmentSubmission.findById(req.params.id);
        if (!submission) return res.status(404).json({ error: 'Submission not found' });
        
        submission.grade = {
            grader_id,
            score,
            feedback,
            feedback_key,
            status: status || 'GRADED',
            graded_at: new Date()
        };
        
        await submission.save();
        
        // Create notification for student
        const assignment = await Assignment.findById(submission.assignment_id);
        if (assignment) {
            const notification = new Notification({
                recipient_id: submission.student_id,
                title: `Assignment Graded: ${assignment.title}`,
                body: `Your submission has been graded. Score: ${score}`,
                type: 'ASSIGNMENT_GRADED',
                source: {
                    entity_id: assignment._id,
                    entity_type: 'ASSIGNMENT'
                }
            });
            await notification.save();
        }
        
        res.json(submission);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Meeting Routes
app.get('/api/meetings', async (req, res) => {
    try {
        const { group_id, status } = req.query;
        const filter = {};
        if (group_id) filter.group_id = group_id;
        if (status) filter.status = status;
        
        const meetings = await Meeting.find(filter)
            .populate('created_by', 'full_name email')
            .populate('attendances.user_id', 'full_name email');
        res.json(meetings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/meetings', async (req, res) => {
    try {
        const meeting = new Meeting(req.body);
        await meeting.save();
        res.status(201).json(meeting);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/meetings/:id/attend', async (req, res) => {
    try {
        const { user_id } = req.body;
        const meeting = await Meeting.findById(req.params.id);
        if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
        
        meeting.attendances.push({
            user_id,
            joined_at: new Date()
        });
        
        await meeting.save();
        res.json(meeting);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/meetings/:id/polls', async (req, res) => {
    try {
        const { question, options } = req.body;
        const meeting = await Meeting.findById(req.params.id);
        if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
        
        const poll = {
            question,
            is_active: true,
            options: options.map((label, index) => ({
                label,
                vote_count: 0,
                voters: []
            }))
        };
        
        meeting.polls.push(poll);
        await meeting.save();
        res.json(meeting);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/meetings/:meetingId/polls/:pollId/vote', async (req, res) => {
    try {
        const { user_id, option_id } = req.body;
        const meeting = await Meeting.findById(req.params.meetingId);
        if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
        
        const poll = meeting.polls.id(req.params.pollId);
        if (!poll) return res.status(404).json({ error: 'Poll not found' });
        
        const option = poll.options.id(option_id);
        if (!option) return res.status(404).json({ error: 'Option not found' });
        
        // Check if user already voted
        const alreadyVoted = poll.options.some(opt => 
            opt.voters && opt.voters.includes(user_id)
        );
        
        if (alreadyVoted) {
            return res.status(400).json({ error: 'User already voted' });
        }
        
        option.vote_count += 1;
        if (!option.voters) option.voters = [];
        option.voters.push(user_id);
        
        await meeting.save();
        res.json(meeting);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Notification Routes
app.get('/api/notifications', async (req, res) => {
    try {
        const { recipient_id, is_read } = req.query;
        const filter = {};
        if (recipient_id) filter.recipient_id = recipient_id;
        if (is_read !== undefined) filter.is_read = is_read === 'true';
        
        const notifications = await Notification.find(filter)
            .sort({ created_at: -1 })
            .limit(50);
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/notifications/:id/read', async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { is_read: true, read_at: new Date() },
            { new: true }
        );
        if (!notification) return res.status(404).json({ error: 'Notification not found' });
        res.json(notification);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/notifications/read-all', async (req, res) => {
    try {
        const { recipient_id } = req.body;
        await Notification.updateMany(
            { recipient_id, is_read: false },
            { is_read: true, read_at: new Date() }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Calendar Events Routes
app.get('/api/calendar-events', async (req, res) => {
    try {
        const { user_id, start_date, end_date } = req.query;
        const filter = { user_id };
        
        if (start_date && end_date) {
            filter.start_at = { $gte: new Date(start_date), $lte: new Date(end_date) };
        }
        
        const events = await CalendarEvent.find(filter).sort({ start_at: 1 });
        res.json(events);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/calendar-events', async (req, res) => {
    try {
        const event = new CalendarEvent(req.body);
        await event.save();
        res.status(201).json(event);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/calendar-events/generate', async (req, res) => {
    try {
        const { user_id, group_id } = req.body;
        
        // Get user's courses
        const enrollments = await CourseEnrollment.find({ user_id });
        const courseIds = enrollments.map(e => e.course_id);
        
        const courses = await Course.find({ _id: { $in: courseIds } });
        
        // Get assignments
        const assignments = await Assignment.find({ 
            group_id,
            status: 'PUBLISHED'
        });
        
        // Get meetings
        const meetings = await Meeting.find({ 
            group_id,
            status: { $in: ['SCHEDULED', 'LIVE'] }
        });
        
        // Get quizzes
        const quizzes = await Quiz.find({ 
            course_id: { $in: courseIds }
        });
        
        const events = [];
        
        // Create calendar events from courses
        for (const course of courses) {
            if (course.start_date) {
                events.push({
                    user_id,
                    title: `Course Start: ${course.title}`,
                    start_at: course.start_date,
                    event_type: 'COURSE_START',
                    source: { entity_id: course._id, entity_type: 'COURSE' }
                });
            }
            if (course.end_date) {
                events.push({
                    user_id,
                    title: `Course End: ${course.title}`,
                    start_at: course.end_date,
                    event_type: 'COURSE_END',
                    source: { entity_id: course._id, entity_type: 'COURSE' }
                });
            }
        }
        
        // Create calendar events from assignments
        for (const assignment of assignments) {
            events.push({
                user_id,
                title: `Assignment Due: ${assignment.title}`,
                start_at: assignment.due_at,
                event_type: 'ASSIGNMENT_DUE',
                source: { entity_id: assignment._id, entity_type: 'ASSIGNMENT' }
            });
        }
        
        // Create calendar events from meetings
        for (const meeting of meetings) {
            events.push({
                user_id,
                title: `Meeting: ${meeting.title}`,
                start_at: meeting.start_at,
                end_at: new Date(meeting.start_at.getTime() + meeting.duration_minutes * 60000),
                event_type: 'MEETING',
                source: { entity_id: meeting._id, entity_type: 'MEETING' }
            });
        }
        
        // Insert events (avoid duplicates)
        for (const event of events) {
            const existing = await CalendarEvent.findOne({
                user_id: event.user_id,
                'source.entity_id': event.source.entity_id,
                'source.entity_type': event.source.entity_type
            });
            
            if (!existing) {
                await CalendarEvent.create(event);
            }
        }
        
        res.json({ message: `Generated ${events.length} events` });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Forum Routes
app.get('/api/forum/posts', async (req, res) => {
    try {
        const { tag_id, status = 'PUBLISHED' } = req.query;
        const filter = { status };
        if (tag_id) filter.tag_ids = tag_id;
        
        const posts = await ForumPost.find(filter)
            .populate('author_id', 'full_name email avatar_key')
            .populate('tag_ids', 'name color')
            .sort({ is_pinned: -1, created_at: -1 });
        
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/forum/posts/:id', async (req, res) => {
    try {
        const post = await ForumPost.findById(req.params.id)
            .populate('author_id', 'full_name email avatar_key')
            .populate('tag_ids', 'name color');
        
        if (!post) return res.status(404).json({ error: 'Post not found' });
        
        // Increment view count
        post.view_count += 1;
        await post.save();
        
        // Get comments
        const comments = await ForumComment.find({ post_id: post._id })
            .populate('author_id', 'full_name email avatar_key')
            .sort({ created_at: 1 });
        
        res.json({ post, comments });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/forum/posts', async (req, res) => {
    try {
        const post = new ForumPost(req.body);
        await post.save();
        
        // Update tag post counts
        if (post.tag_ids && post.tag_ids.length > 0) {
            await ForumTag.updateMany(
                { _id: { $in: post.tag_ids } },
                { $inc: { post_count: 1 } }
            );
        }
        
        res.status(201).json(post);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/forum/posts/:id/comments', async (req, res) => {
    try {
        const comment = new ForumComment({
            post_id: req.params.id,
            ...req.body
        });
        await comment.save();
        
        res.status(201).json(comment);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/forum/votes/user/:userId', async (req, res) => {
    try {
        const votes = await ForumVote.find({ user_id: req.params.userId });
        res.json(votes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/forum/votes', async (req, res) => {
    try {
        const { user_id, target_id, target_type, vote_type } = req.body;
        
        // Check if vote exists
        let vote = await ForumVote.findOne({
            user_id,
            target_id,
            target_type
        });
        
        if (vote) {
            // Update existing vote
            if (vote.vote_type !== vote_type) {
                // Change vote
                if (target_type === 'FORUM_POST') {
                    if (vote.vote_type === 'UPVOTE') {
                        await ForumPost.findByIdAndUpdate(target_id, { $inc: { upvote_count: -1 } });
                    }
                    if (vote_type === 'UPVOTE') {
                        await ForumPost.findByIdAndUpdate(target_id, { $inc: { upvote_count: 1 } });
                    }
                } else if (target_type === 'FORUM_COMMENT') {
                    if (vote.vote_type === 'UPVOTE') {
                        await ForumComment.findByIdAndUpdate(target_id, { $inc: { upvote_count: -1 } });
                    }
                    if (vote_type === 'UPVOTE') {
                        await ForumComment.findByIdAndUpdate(target_id, { $inc: { upvote_count: 1 } });
                    }
                }
                vote.vote_type = vote_type;
                await vote.save();
            } else {
                // Remove vote (toggle)
                if (target_type === 'FORUM_POST') {
                    await ForumPost.findByIdAndUpdate(target_id, { $inc: { upvote_count: -1 } });
                } else if (target_type === 'FORUM_COMMENT') {
                    await ForumComment.findByIdAndUpdate(target_id, { $inc: { upvote_count: -1 } });
                }
                await vote.deleteOne();
                return res.json({ message: 'Vote removed' });
            }
        } else {
            // Create new vote
            vote = new ForumVote({
                user_id,
                target_id,
                target_type,
                vote_type
            });
            await vote.save();
            
            // Update vote count
            if (vote_type === 'UPVOTE') {
                if (target_type === 'FORUM_POST') {
                    await ForumPost.findByIdAndUpdate(target_id, { $inc: { upvote_count: 1 } });
                } else if (target_type === 'FORUM_COMMENT') {
                    await ForumComment.findByIdAndUpdate(target_id, { $inc: { upvote_count: 1 } });
                }
            }
        }
        
        res.json(vote);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/forum/saved-posts', async (req, res) => {
    try {
        const { user_id, post_id } = req.body;
        
        const saved = new ForumSavedPost({
            user_id,
            post_id,
            saved_at: new Date()
        });
        
        await saved.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/forum/saved-posts', async (req, res) => {
    try {
        const { user_id, post_id } = req.query;
        
        await ForumSavedPost.deleteOne({ user_id, post_id });
        res.json({ message: 'Post unsaved' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Forum Tags Routes
app.get('/api/forum/tags', async (req, res) => {
    try {
        const tags = await ForumTag.find().sort({ post_count: -1 });
        res.json(tags);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/forum/tags', async (req, res) => {
    try {
        const tag = new ForumTag(req.body);
        await tag.save();
        res.status(201).json(tag);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Group Feed Routes
app.get('/api/groups/:groupId/feed', async (req, res) => {
    try {
        const posts = await GroupFeedPost.find({ group_id: req.params.groupId })
            .populate('author_id', 'full_name email avatar_key')
            .sort({ is_pinned: -1, created_at: -1 })
            .limit(50);
        
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/groups/:groupId/feed', async (req, res) => {
    try {
        const post = new GroupFeedPost({
            group_id: req.params.groupId,
            ...req.body
        });
        await post.save();
        
        // Create notifications for group members
        const group = await StudyGroup.findById(req.params.groupId);
        if (group) {
            const notifications = group.members
                .filter(m => m.user_id.toString() !== post.author_id.toString() && m.status === 'ACTIVE')
                .map(m => ({
                    recipient_id: m.user_id,
                    title: 'New Group Post',
                    body: `${post.author_id} posted in ${group.name}`,
                    type: 'SYSTEM',
                    source: { entity_id: post._id, entity_type: 'GROUP_FEED' }
                }));
            
            if (notifications.length > 0) {
                await Notification.insertMany(notifications);
            }
        }
        
        res.status(201).json(post);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/feed-posts/:postId/comments', async (req, res) => {
    try {
        const comment = new GroupFeedComment({
            feed_post_id: req.params.postId,
            ...req.body
        });
        await comment.save();
        
        // Increment comment count
        await GroupFeedPost.findByIdAndUpdate(req.params.postId, {
            $inc: { comment_count: 1 }
        });
        
        res.status(201).json(comment);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/feed-posts/:postId/reactions', async (req, res) => {
    try {
        const { user_id, emoji } = req.body;
        const post = await GroupFeedPost.findById(req.params.postId);
        
        if (!post) return res.status(404).json({ error: 'Post not found' });
        
        // Check if reaction exists
        const existingReactionIndex = post.reactions.findIndex(
            r => r.user_id.toString() === user_id && r.emoji === emoji
        );
        
        if (existingReactionIndex >= 0) {
            // Remove reaction
            post.reactions.splice(existingReactionIndex, 1);
            post.reaction_count -= 1;
        } else {
            // Add reaction
            post.reactions.push({
                user_id,
                emoji,
                created_at: new Date()
            });
            post.reaction_count += 1;
        }
        
        await post.save();
        res.json(post);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API: http://localhost:${PORT}/api`);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
});