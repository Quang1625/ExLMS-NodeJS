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

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../public/uploads/avatars');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `avatar-${req.params.id}-${Date.now()}${ext}`);
    }
});

const uploadAvatar = multer({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận ảnh (jpg, jpeg, png, gif, webp)'));
        }
    }
});

// POST update avatar
router.post('/:id/avatar', uploadAvatar.single('avatar'), async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Vui lòng chọn một file ảnh' });
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        // Remove old avatar if exists locally
        if (user.avatar_key && user.avatar_key.startsWith('/uploads/avatars/')) {
            const oldPath = path.join(__dirname, '../../public', user.avatar_key);
            if (fs.existsSync(oldPath)) {
                try { fs.unlinkSync(oldPath); } catch (e) { console.error(e); }
            }
        }
        
        user.avatar_key = `/uploads/avatars/${req.file.filename}`;
        await user.save();
        
        res.json({
            message: 'Cập nhật ảnh đại diện thành công',
            avatar_url: user.avatar_key,
            user: {
                _id: user._id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                avatar_key: user.avatar_key,
                bio: user.bio,
                created_at: user.created_at
            }
        });
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
