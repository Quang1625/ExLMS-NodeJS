const router = require('express').Router();
const { CourseEnrollment } = require('../models/Course');
const { Course } = require('../models/Course');
const { StudyGroup } = require('../models/StudyGroup');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Helper: count total lessons in a course
async function getTotalLessonsInCourse(courseId) {
    const course = await Course.findById(courseId);
    if (!course) return 0;
    return course.chapters.reduce((total, ch) => total + (ch.lessons?.length || 0), 0);
}

// GET enrollments (filter by user_id or course_id)
router.get('/', async (req, res, next) => {
    try {
        const { user_id, course_id } = req.query;
        const filter = {};
        
        // If student, only allow seeing their own enrollments unless specified otherwise by admin
        if (req.user.role === 'STUDENT') {
            filter.user_id = req.user._id;
        } else if (user_id) {
            filter.user_id = user_id;
        }
        
        if (course_id) filter.course_id = course_id;

        const enrollments = await CourseEnrollment.find(filter)
            .populate('user_id', 'full_name email')
            .populate('course_id', 'title');
        res.json({ success: true, data: enrollments });
    } catch (err) { next(err); }
});

// GET /my-progress/:courseId – get current user progress for a course
router.get('/my-progress/:courseId', async (req, res, next) => {
    try {
        const enrollment = await CourseEnrollment.findOne({ 
            course_id: req.params.courseId, 
            user_id: req.user._id 
        }).populate('course_id', 'title chapters');
        
        if (!enrollment) return res.status(404).json({ success: false, error: 'Chưa tham gia khóa học này' });
        
        res.json({ success: true, data: enrollment });
    } catch (err) { next(err); }
});

// POST enroll in a course (for Admin/Instructor to enroll others)
router.post('/', async (req, res, next) => {
    try {
        // Validation: only Admin/Instructor can enroll others
        if (req.user.role === 'STUDENT' && req.body.user_id !== req.user._id.toString()) {
            return res.status(403).json({ success: false, error: 'Bạn không có quyền đăng ký cho người khác' });
        }
        
        const enrollment = new CourseEnrollment(req.body);
        await enrollment.save();
        res.status(201).json({ success: true, data: enrollment });
    } catch (err) { next(err); }
});

// POST /enrollments/start/:courseId – Self-enroll in a course
router.post('/start/:courseId', async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.courseId);
        if (!course) return res.status(404).json({ success: false, error: 'Course not found' });
        if (course.status !== 'PUBLISHED') return res.status(403).json({ success: false, error: 'Khóa học này chưa được xuất bản' });

        // Check if user is in the group
        const group = await StudyGroup.findById(course.group_id);
        if (group) {
            const isMember = group.members.some(m => m.user_id.toString() === req.user._id.toString() && m.status === 'ACTIVE');
            if (!isMember) return res.status(403).json({ success: false, error: 'Bạn phải là thành viên của nhóm để đăng ký khóa học này' });
        }

        const existing = await CourseEnrollment.findOne({ course_id: course._id, user_id: req.user._id });
        if (existing) return res.json({ success: true, data: existing, message: 'Bạn đã đăng ký khóa học này rồi' });

        const enrollment = new CourseEnrollment({
            course_id: course._id,
            user_id: req.user._id,
            enrolled_at: new Date()
        });
        await enrollment.save();
        res.status(201).json({ success: true, data: enrollment, message: 'Đăng ký khóa học thành công' });
    } catch (err) { next(err); }
});

// PUT update lesson progress
router.put('/:id/progress', async (req, res, next) => {
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
            if (is_completed && !lessonProgress.completed_at) lessonProgress.completed_at = new Date();
        } else {
            enrollment.lesson_progress.push({
                lesson_id,
                is_completed: is_completed || false,
                last_position_sec: last_position_sec || 0,
                completed_at: is_completed ? new Date() : null
            });
        }

        const totalLessons = await getTotalLessonsInCourse(enrollment.course_id);
        const completedLessons = enrollment.lesson_progress.filter(lp => lp.is_completed).length;
        enrollment.progress_percent = (totalLessons > 0 && completedLessons === totalLessons) ? 100 : 0;

        if (enrollment.progress_percent >= 100) {
            enrollment.is_completed = true;
            enrollment.completed_at = new Date();
        }

        await enrollment.save();
        res.json({ success: true, data: enrollment });
    } catch (err) { next(err); }
});

module.exports = router;
