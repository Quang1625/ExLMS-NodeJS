const router = require('express').Router();
const { Course, CourseEnrollment } = require('../models/Course');
const { StudyGroup } = require('../models/StudyGroup');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadLesson, multerErrorHandling } = require('../middleware/upload');

// ── All routes require authentication ─────────────────────────────────────────
router.use(authenticate);

const ADMIN_ONLY   = authorize('ADMIN');
const CAN_MANAGE   = authorize('ADMIN', 'INSTRUCTOR');

// ── Instructor/Admin Lesson & Chapter Management ─────────────────────────────

// GET /courses/:id/chapters – get all chapters for a course
router.get('/:id/chapters', async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id).select('chapters');
        if (!course) return res.status(404).json({ success: false, error: 'Course not found' });
        res.json({ success: true, data: course.chapters });
    } catch (err) { next(err); }
});

// POST /courses/upload – upload slide or video (ADMIN/INSTRUCTOR only)
router.post('/upload', CAN_MANAGE, uploadLesson.single('file'), multerErrorHandling, async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
        
        // Return file info to be used in lesson creation
        res.json({ 
            success: true, 
            data: {
                resource_key: req.file.filename,
                original_name: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /courses/:id/chapters – add new chapter to a course
router.post('/:id/chapters', CAN_MANAGE, async (req, res, next) => {
    try {
        const { title, description, order_index, is_locked } = req.body;
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ success: false, error: 'Course not found' });

        const newChapter = {
            title,
            description,
            order_index: order_index || (course.chapters.length + 1),
            is_locked: is_locked || false,
            lessons: []
        };

        course.chapters.push(newChapter);
        await course.save();

        res.status(201).json({ 
            success: true, 
            data: course.chapters[course.chapters.length - 1], 
            message: 'Chương mới đã được tạo thành công' 
        });
    } catch (err) { next(err); }
});

// PUT /courses/:id/chapters/:chapterId – update chapter details
router.put('/:id/chapters/:chapterId', CAN_MANAGE, async (req, res, next) => {
    try {
        const { title, description, order_index, is_locked, unlock_after_chapter } = req.body;
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ success: false, error: 'Course not found' });

        const chapter = course.chapters.id(req.params.chapterId);
        if (!chapter) return res.status(404).json({ success: false, error: 'Chapter not found' });

        if (title !== undefined) chapter.title = title;
        if (description !== undefined) chapter.description = description;
        if (order_index !== undefined) chapter.order_index = order_index;
        if (is_locked !== undefined) chapter.is_locked = is_locked;
        if (unlock_after_chapter !== undefined) chapter.unlock_after_chapter = unlock_after_chapter;

        await course.save();
        res.json({ success: true, data: chapter, message: 'Cập nhật chương thành công' });
    } catch (err) { next(err); }
});

// DELETE /courses/:id/chapters/:chapterId – delete a chapter
router.delete('/:id/chapters/:chapterId', CAN_MANAGE, async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ success: false, error: 'Course not found' });

        const chapter = course.chapters.id(req.params.chapterId);
        if (!chapter) return res.status(404).json({ success: false, error: 'Chapter not found' });

        chapter.remove();
        await course.save();
        res.json({ success: true, message: 'Đã xóa chương thành công' });
    } catch (err) { next(err); }
});

// POST /courses/:id/chapters/:chapterId/lessons – add new lesson to a chapter
router.post('/:id/chapters/:chapterId/lessons', CAN_MANAGE, async (req, res, next) => {
    try {
        const { id: courseId, chapterId } = req.params;
        const { title, content_type, content, resource_key, duration_seconds, order_index } = req.body;

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ success: false, error: 'Course not found' });

        const chapter = course.chapters.id(chapterId);
        if (!chapter) return res.status(404).json({ success: false, error: 'Chapter not found' });

        // Add lesson
        const newLesson = {
            title,
            content_type,
            content,
            resource_key,
            duration_seconds,
            order_index: order_index || (chapter.lessons.length + 1)
        };

        chapter.lessons.push(newLesson);
        await course.save();

        res.status(201).json({ 
            success: true, 
            data: chapter.lessons[chapter.lessons.length - 1], 
            message: 'Bài học đã được thêm thành công' 
        });
    } catch (err) { next(err); }
});

// GET /courses – list (filter by group_id, status)
router.get('/', async (req, res, next) => {
    try {
        const { group_id, status } = req.query;
        const filter = {};
        if (group_id) filter.group_id = group_id;
        if (status)   filter.status   = status;

        const courses = await Course.find(filter)
            .populate('created_by', 'full_name email')
            .populate('group_id', 'name')
            .sort({ order_index: 1, created_at: -1 });
        res.json({ success: true, data: courses });
    } catch (err) { next(err); }
});

// GET /courses/:id – detail
router.get('/:id', async (req, res, next) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('created_by', 'full_name email')
            .populate('group_id', 'name visibility members');
            
        if (!course) return res.status(404).json({ success: false, error: 'Course not found' });

        // Access check for STUDENTS
        if (req.user.role === 'STUDENT') {
            if (course.status !== 'PUBLISHED') {
                return res.status(403).json({ success: false, error: 'Khóa học này chưa được xuất bản' });
            }

            const group = course.group_id;
            if (group) {
                const isMember = group.members.some(m => 
                    m.user_id.toString() === req.user._id.toString() && m.status === 'ACTIVE'
                );
                if (!isMember) {
                    return res.status(403).json({ success: false, error: 'Bạn phải là thành viên của nhóm để xem khóa học này' });
                }
            }
        }

        // Clean up members array from response to avoid leaking data
        if (course.group_id) {
            course.group_id.members = undefined;
        }

        res.json({ success: true, data: course });
    } catch (err) { next(err); }
});

// POST /courses – create (ADMIN ONLY)
router.post('/', ADMIN_ONLY, async (req, res, next) => {
    try {
        const course = new Course({
            ...req.body,
            created_by: req.user._id,
            status: req.body.status || 'DRAFT'
        });
        await course.save();
        res.status(201).json({ success: true, data: course, message: 'Khóa học đã được tạo thành công' });
    } catch (err) { next(err); }
});

// PUT /courses/:id – update (ADMIN or INSTRUCTOR)
router.put('/:id', CAN_MANAGE, async (req, res, next) => {
    try {
        const { created_by, ...updateData } = req.body;
        const course = await Course.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('created_by', 'full_name email').populate('group_id', 'name');
        if (!course) return res.status(404).json({ success: false, error: 'Course not found' });
        res.json({ success: true, data: course, message: 'Khóa học đã được cập nhật' });
    } catch (err) { next(err); }
});

// DELETE /courses/:id – soft delete → ARCHIVED (ADMIN or INSTRUCTOR)
router.delete('/:id', CAN_MANAGE, async (req, res, next) => {
    try {
        const course = await Course.findByIdAndUpdate(
            req.params.id,
            { status: 'ARCHIVED' },
            { new: true }
        );
        if (!course) return res.status(404).json({ success: false, error: 'Course not found' });
        res.json({ success: true, message: 'Khóa học đã được lưu trữ (archived)' });
    } catch (err) { next(err); }
});

// GET /courses/:id/lessons/:lessonId – get single lesson detail & record progress
router.get('/:id/lessons/:lessonId', async (req, res, next) => {
    try {
        const { id: courseId, lessonId } = req.params;
        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ success: false, error: 'Course not found' });

        // Authorization check
        if (req.user.role === 'STUDENT') {
            if (course.status !== 'PUBLISHED') return res.status(403).json({ success: false, error: 'Khóa học chưa được xuất bản' });
            
            // Check enrollment
            const enrollment = await CourseEnrollment.findOne({ course_id: courseId, user_id: req.user._id });
            if (!enrollment) return res.status(403).json({ success: false, error: 'Bạn chưa đăng ký khóa học này' });

            // Record progress (upsert into lesson_progress)
            const exists = enrollment.lesson_progress.some(lp => lp.lesson_id.toString() === lessonId);
            if (!exists) {
                enrollment.lesson_progress.push({ lesson_id: lessonId, is_completed: false });
                await enrollment.save();
            }
        }

        // Find lesson in chapters
        let lesson = null;
        for (const chapter of course.chapters) {
            lesson = chapter.lessons.find(l => l._id.toString() === lessonId);
            if (lesson) break;
        }

        if (!lesson) return res.status(404).json({ success: false, error: 'Lesson not found in this course' });

        res.json({ success: true, data: lesson });
    } catch (err) { next(err); }
});

module.exports = router;
