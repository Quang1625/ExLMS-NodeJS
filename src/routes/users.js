const router = require('express').Router();
const User = require('../models/User');

// GET all users
router.get('/', async (req, res, next) => {
    try {
        const users = await User.find().select('-password_hash -sessions');
        res.json(users);
    } catch (err) { next(err); }
});

// GET user by ID
router.get('/:id', async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select('-password_hash -sessions');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) { next(err); }
});

// POST create user
router.post('/', async (req, res, next) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).json(user);
    } catch (err) { next(err); }
});

// PUT update user
router.put('/:id', async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).select('-password_hash -sessions');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) { next(err); }
});

// DELETE user
router.delete('/:id', async (req, res, next) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    } catch (err) { next(err); }
});

// PATCH update user role and/or status (Admin only)
router.patch('/:id/role-status', async (req, res, next) => {
    try {
        const { role, status } = req.body;
        const update = {};
        if (role)   update.role   = role;
        if (status) update.status = status;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            update,
            { new: true, runValidators: true }
        ).select('-password_hash -sessions');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) { next(err); }
});

module.exports = router;
