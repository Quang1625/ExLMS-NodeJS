const router = require('express').Router();
const Notification = require('../models/Notification');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET notifications
router.get('/', async (req, res, next) => {
    try {
        const { is_read } = req.query;
        const filter = { recipient_id: req.user._id };
        if (is_read !== undefined) filter.is_read = is_read === 'true';

        const notifications = await Notification.find(filter)
            .sort({ created_at: -1 })
            .limit(50);
        res.json({ success: true, data: notifications });
    } catch (err) { next(err); }
});

// PUT mark single notification as read
router.put('/:id/read', async (req, res, next) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient_id: req.user._id },
            { is_read: true, read_at: new Date() },
            { new: true }
        );
        if (!notification) return res.status(404).json({ error: 'Notification not found' });
        res.json({ success: true, data: notification });
    } catch (err) { next(err); }
});

// PUT mark all notifications as read
router.put('/read-all', async (req, res, next) => {
    try {
        await Notification.updateMany(
            { recipient_id: req.user._id, is_read: false },
            { is_read: true, read_at: new Date() }
        );
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (err) { next(err); }
});

// DELETE all read notifications
router.delete('/read', async (req, res, next) => {
    try {
        const result = await Notification.deleteMany({ recipient_id: req.user._id, is_read: true });
        res.json({ success: true, message: 'Đã xóa tất cả thông báo đã đọc', count: result.deletedCount });
    } catch (err) { next(err); }
});

// DELETE single notification
router.delete('/:id', async (req, res, next) => {
    try {
        const notification = await Notification.findOneAndDelete({ _id: req.params.id, recipient_id: req.user._id });
        if (!notification) return res.status(404).json({ error: 'Không tìm thấy thông báo' });
        res.json({ success: true, message: 'Đã xóa thông báo' });
    } catch (err) { next(err); }
});

module.exports = router;
