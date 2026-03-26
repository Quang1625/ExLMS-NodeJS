const router = require('express').Router();
const { StudyGroup, GroupFeedPost, GroupFeedComment } = require('../models/StudyGroup');
const Notification = require('../models/Notification');
const { authenticate, authorize } = require('../middleware/auth');

// ── All routes require authentication ─────────────────────────────────────────
router.use(authenticate);

const CAN_MANAGE = authorize('ADMIN', 'INSTRUCTOR');

// GET /study-groups – list all active groups
router.get('/', async (req, res, next) => {
    try {
        const { category, visibility } = req.query;
        const filter = { status: 'ACTIVE' };
        if (category)   filter.category   = category;
        if (visibility) filter.visibility = visibility;

        const groups = await StudyGroup.find(filter)
            .populate('owner_id', 'full_name email avatar_key')
            .sort({ created_at: -1 });
        res.json({ success: true, data: groups });
    } catch (err) { next(err); }
});

// GET /study-groups/:id – detail
router.get('/:id', async (req, res, next) => {
    try {
        const group = await StudyGroup.findById(req.params.id)
            .populate('owner_id', 'full_name email avatar_key')
            .populate('members.user_id', 'full_name email avatar_key');
        if (!group) return res.status(404).json({ success: false, error: 'Group not found' });
        res.json({ success: true, data: group });
    } catch (err) { next(err); }
});

// POST /study-groups – create (ADMIN or INSTRUCTOR only)
router.post('/', CAN_MANAGE, async (req, res, next) => {
    try {
        const group = new StudyGroup({
            ...req.body,
            owner_id: req.user._id,
            status: req.body.status || 'ACTIVE',
            members: [{
                user_id:  req.user._id,
                role:     'OWNER',
                status:   'ACTIVE',
                joined_at: new Date()
            }],
            member_count: 1
        });
        await group.save();
        res.status(201).json({ success: true, data: group, message: 'Nhóm học đã được tạo thành công' });
    } catch (err) { next(err); }
});

// PUT /study-groups/:id – update (ADMIN or INSTRUCTOR only)
router.put('/:id', CAN_MANAGE, async (req, res, next) => {
    try {
        const { owner_id, members, member_count, ...updateData } = req.body; // protect sensitive fields
        const group = await StudyGroup.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('owner_id', 'full_name email avatar_key');
        if (!group) return res.status(404).json({ success: false, error: 'Group not found' });
        res.json({ success: true, data: group, message: 'Nhóm học đã được cập nhật' });
    } catch (err) { next(err); }
});

// DELETE /study-groups/:id – soft delete (ADMIN or INSTRUCTOR only)
router.delete('/:id', CAN_MANAGE, async (req, res, next) => {
    try {
        const group = await StudyGroup.findByIdAndUpdate(
            req.params.id,
            { status: 'DELETED' },
            { new: true }
        );
        if (!group) return res.status(404).json({ success: false, error: 'Group not found' });
        res.json({ success: true, message: 'Nhóm học đã được xóa' });
    } catch (err) { next(err); }
});

// POST /study-groups/:id/members – add member
router.post('/:id/members', async (req, res, next) => {
    try {
        const { user_id, role } = req.body;
        const group = await StudyGroup.findById(req.params.id);
        if (!group) return res.status(404).json({ success: false, error: 'Group not found' });
        if (group.status !== 'ACTIVE')
            return res.status(400).json({ success: false, error: 'Group is not active' });

        const alreadyMember = group.members.some(m => m.user_id.toString() === user_id);
        if (alreadyMember)
            return res.status(409).json({ success: false, error: 'User is already a member' });

        group.members.push({ user_id, role: role || 'MEMBER', status: 'ACTIVE', joined_at: new Date() });
        group.member_count = group.members.filter(m => m.status === 'ACTIVE').length;
        await group.save();
        res.json({ success: true, data: group, message: 'Thêm thành viên thành công' });
    } catch (err) { next(err); }
});

// ── Join Requests ────────────────────────────────────────────────────────────

// POST /study-groups/:id/join-requests – Request to join a group
router.post('/:id/join-requests', async (req, res, next) => {
    try {
        const { message } = req.body || {};
        const group = await StudyGroup.findById(req.params.id);
        if (!group) return res.status(404).json({ success: false, error: 'Group not found' });
        if (group.status !== 'ACTIVE')
            return res.status(400).json({ success: false, error: 'Group is not active' });

        // Check if already a member
        if (group.members.some(m => m.user_id.toString() === req.user._id.toString())) {
            return res.status(409).json({ success: false, error: 'Bạn đã là thành viên của nhóm này' });
        }

        // Check if pending request exists
        if (group.join_requests.some(r => r.user_id.toString() === req.user._id.toString() && r.status === 'PENDING')) {
            return res.status(409).json({ success: false, error: 'Bạn đã gửi yêu cầu rồi, vui lòng chờ duyệt' });
        }

        if (group.visibility === 'PUBLIC') {
            // Auto-join public groups
            group.members.push({ user_id: req.user._id, role: 'MEMBER', status: 'ACTIVE', joined_at: new Date() });
            group.member_count = group.members.filter(m => m.status === 'ACTIVE').length;
            await group.save();
            
            // Auto-enroll in all group courses
            const { Course, CourseEnrollment } = require('../models/Course');
            const courses = await Course.find({ group_id: group._id, status: 'PUBLISHED' });
            for (const c of courses) {
                await CourseEnrollment.updateOne(
                    { course_id: c._id, user_id: req.user._id },
                    { $setOnInsert: { course_id: c._id, user_id: req.user._id } },
                    { upsert: true }
                );
            }
            
            return res.json({ success: true, data: group, message: 'Đã tham gia nhóm thành công' });
        } else {
            // Private group: create pending request
            group.join_requests.push({ user_id: req.user._id, message, status: 'PENDING' });
            await group.save();
            return res.status(201).json({ success: true, message: 'Đã gửi yêu cầu tham gia, vui lòng chờ duyệt' });
        }
    } catch (err) { next(err); }
});

// GET /study-groups/:id/join-requests – List pending requests (ADMIN/INSTRUCTOR only)
router.get('/:id/join-requests', CAN_MANAGE, async (req, res, next) => {
    try {
        const group = await StudyGroup.findById(req.params.id)
            .populate('join_requests.user_id', 'full_name email avatar_key');
        if (!group) return res.status(404).json({ success: false, error: 'Group not found' });
        
        const pending = group.join_requests.filter(r => r.status === 'PENDING');
        res.json({ success: true, data: pending });
    } catch (err) { next(err); }
});

// PUT /study-groups/:id/join-requests/:requestId – Approve or Reject request
router.put('/:id/join-requests/:requestId', CAN_MANAGE, async (req, res, next) => {
    try {
        const { status } = req.body; // 'APPROVED' or 'REJECTED'
        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Trạng thái không hợp lệ' });
        }

        const group = await StudyGroup.findById(req.params.id);
        if (!group) return res.status(404).json({ success: false, error: 'Group not found' });

        const request = group.join_requests.id(req.params.requestId);
        if (!request) return res.status(404).json({ success: false, error: 'Request not found' });
        if (request.status !== 'PENDING') return res.status(400).json({ success: false, error: 'Yêu cầu này đã được xử lý' });

        request.status = status;
        request.reviewed_by = req.user._id;
        request.reviewed_at = new Date();

        if (status === 'APPROVED') {
            const alreadyMember = group.members.some(m => m.user_id.toString() === request.user_id.toString());
            if (!alreadyMember) {
                group.members.push({ user_id: request.user_id, role: 'MEMBER', status: 'ACTIVE', joined_at: new Date() });
                group.member_count = group.members.filter(m => m.status === 'ACTIVE').length;
            }

            // Auto-enroll in all group courses
            const { Course, CourseEnrollment } = require('../models/Course');
            const courses = await Course.find({ group_id: group._id, status: 'PUBLISHED' });
            for (const c of courses) {
                await CourseEnrollment.updateOne(
                    { course_id: c._id, user_id: request.user_id },
                    { $setOnInsert: { course_id: c._id, user_id: request.user_id } },
                    { upsert: true }
                );
            }
            
            await Notification.create({
                recipient_id: request.user_id,
                title: 'Yêu cầu tham gia nhóm được duyệt',
                body: `Yêu cầu tham gia nhóm "${group.name}" của bạn đã được chấp nhận.`,
                type: 'SYSTEM',
                source: { entity_id: group._id, entity_type: 'STUDY_GROUP' }
            });
        } else {
            await Notification.create({
                recipient_id: request.user_id,
                title: 'Yêu cầu tham gia nhóm bị từ chối',
                body: `Yêu cầu tham gia nhóm "${group.name}" của bạn đã bị từ chối.`,
                type: 'SYSTEM',
                source: { entity_id: group._id, entity_type: 'STUDY_GROUP' }
            });
        }

        await group.save();
        res.json({ success: true, message: `Yêu cầu đã được ${status === 'APPROVED' ? 'chấp nhận' : 'từ chối'}` });
    } catch (err) { next(err); }
});

// ── Feed ───────────────────────────────────────────────────────────────────

// GET /study-groups/:groupId/feed – group feed posts
router.get('/:groupId/feed', async (req, res, next) => {
    try {
        const posts = await GroupFeedPost.find({ group_id: req.params.groupId })
            .populate('author_id', 'full_name email avatar_key')
            .sort({ is_pinned: -1, created_at: -1 })
            .limit(50);
        res.json({ success: true, data: posts });
    } catch (err) { next(err); }
});

// POST /study-groups/:groupId/feed – create feed post
router.post('/:groupId/feed', async (req, res, next) => {
    try {
        const post = new GroupFeedPost({
            group_id:  req.params.groupId,
            author_id: req.user._id,
            ...req.body
        });
        await post.save();

        // Notify active group members (excluding the author)
        const group = await StudyGroup.findById(req.params.groupId);
        if (group) {
            const notifications = group.members
                .filter(m => m.user_id.toString() !== req.user._id.toString() && m.status === 'ACTIVE')
                .map(m => ({
                    recipient_id: m.user_id,
                    title: 'Bài đăng mới trong nhóm',
                    body:  `Bài viết mới trong ${group.name}`,
                    type:  'SYSTEM',
                    source: { entity_id: post._id, entity_type: 'GROUP_FEED' }
                }));
            if (notifications.length > 0) await Notification.insertMany(notifications);
        }
        res.status(201).json({ success: true, data: post, message: 'Đăng bài thành công' });
    } catch (err) { next(err); }
});

module.exports = router;
