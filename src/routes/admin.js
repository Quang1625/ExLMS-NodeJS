const router = require('express').Router();
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');

// GET all users (ADMIN only)
router.get('/users', authenticate, authorize('ADMIN'), async (req, res, next) => {
    try {
        const users = await User.find().select('-password_hash -sessions').sort({ created_at: -1 });
        res.json(users);
    } catch (err) { next(err); }
});

// PUT update user role (ADMIN only)
router.put('/users/:id/role', authenticate, authorize('ADMIN'), async (req, res, next) => {
    try {
        const { role } = req.body;
        if (!['ADMIN', 'INSTRUCTOR', 'STUDENT'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password_hash -sessions');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) { next(err); }
});

// PUT update user status (ADMIN only)
router.put('/users/:id/status', authenticate, authorize('ADMIN'), async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!['PENDING', 'ACTIVE', 'SUSPENDED', 'DELETED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true }).select('-password_hash -sessions');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) { next(err); }
});

module.exports = router;
