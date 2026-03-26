const router = require('express').Router();
const { Course } = require('../models/Course');
const { StudyGroup } = require('../models/StudyGroup');
const { authenticate, authorize } = require('../middleware/auth');

// ── All routes require authentication ─────────────────────────────────────────
router.use(authenticate);

const ADMIN_ONLY   = authorize('ADMIN');
const CAN_MANAGE   = authorize('ADMIN', 'INSTRUCTOR');

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

module.exports = router;
