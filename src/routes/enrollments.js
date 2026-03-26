const router = require('express').Router();
const { CourseEnrollment } = require('../models/Course');
const { Course } = require('../models/Course');

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
        if (user_id) filter.user_id = user_id;
        if (course_id) filter.course_id = course_id;

        const enrollments = await CourseEnrollment.find(filter)
            .populate('user_id', 'full_name email')
            .populate('course_id', 'title');
        res.json(enrollments);
    } catch (err) { next(err); }
});

// POST enroll in a course
router.post('/', async (req, res, next) => {
    try {
        const enrollment = new CourseEnrollment(req.body);
        await enrollment.save();
        res.status(201).json(enrollment);
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
        enrollment.progress_percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

        if (enrollment.progress_percent >= 100) {
            enrollment.is_completed = true;
            enrollment.completed_at = new Date();
        }

        await enrollment.save();
        res.json(enrollment);
    } catch (err) { next(err); }
});

module.exports = router;
