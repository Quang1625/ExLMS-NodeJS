const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');
const Notification = require('../models/Notification');
const User = require('../models/User');
const socket = require('../../Server/socket');
const { ForumTag, ForumPost, ForumComment, ForumVote, ForumSavedPost } = require('../models/Forum');
const { GroupFeedPost, GroupFeedComment } = require('../models/StudyGroup');

// Upload storage for forum attachments
const forumStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../public/uploads/forum');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + '-' + safeName);
    }
});

const forumUpload = multer({
    storage: forumStorage,
    limits: { fileSize: 20 * 1024 * 1024 }
});

// ─── Forum Tags ──────────────────────────────────────────────────────────────

router.get('/tags', async (req, res, next) => {
    try {
        const tags = await ForumTag.find().sort({ post_count: -1 });
        res.json(tags);
    } catch (err) { next(err); }
});

router.post('/tags', async (req, res, next) => {
    try {
        const tag = new ForumTag(req.body);
        await tag.save();
        res.status(201).json(tag);
    } catch (err) { next(err); }
});

// ─── Forum Posts ─────────────────────────────────────────────────────────────

router.get('/posts', async (req, res, next) => {
    try {
        const { tag_id, status = 'PUBLISHED' } = req.query;
        const filter = { status };
        if (tag_id) filter.tag_ids = tag_id;

        const posts = await ForumPost.find(filter)
            .populate('author_id', 'full_name email avatar_key')
            .populate('tag_ids', 'name color')
            .sort({ is_pinned: -1, created_at: -1 });
        res.json(posts);
    } catch (err) { next(err); }
});

router.get('/posts/:id', async (req, res, next) => {
    try {
        const post = await ForumPost.findById(req.params.id)
            .populate('author_id', 'full_name email avatar_key')
            .populate('tag_ids', 'name color');
        if (!post) return res.status(404).json({ error: 'Post not found' });

        post.view_count += 1;
        await post.save();

        const comments = await ForumComment.find({ post_id: post._id })
            .populate('author_id', 'full_name email avatar_key')
            .sort({ created_at: 1 });

        res.json({ post, comments });
    } catch (err) { next(err); }
});

router.post('/posts', (req, res, next) => {
    const contentType = (req.headers['content-type'] || '').toLowerCase();
    if (contentType.startsWith('multipart/form-data')) {
        return forumUpload.array('attachments', 8)(req, res, next);
    }
    next();
}, async (req, res, next) => {
    try {
        const { title, content, status = 'PUBLISHED', tag_ids, author_id } = req.body;
        const attachments = (req.files || []).map(file => ({
            filename: file.originalname,
            object_key: '/uploads/forum/' + file.filename,
            file_size: file.size,
            mime_type: file.mimetype
        }));

        const post = new ForumPost({
            title,
            content,
            status,
            author_id,
            tag_ids: Array.isArray(tag_ids) ? tag_ids : (tag_ids ? [tag_ids] : []),
            attachments
        });

        await post.save();
        if (post.tag_ids?.length > 0) {
            await ForumTag.updateMany({ _id: { $in: post.tag_ids } }, { $inc: { post_count: 1 } });
        }

        // Notify users
        try {
            const author = await User.findById(author_id).select('full_name');
            const usersToNotify = await User.find({
                'notification_settings.new_forum_post': true,
                _id: { $ne: author_id },
                status: 'ACTIVE'
            }).select('_id');

            if (usersToNotify.length > 0) {
                const notifications = usersToNotify.map(u => ({
                    recipient_id: u._id,
                    title: `Bài viết mới: ${title}`,
                    body: `${author?.full_name || 'Ai đó'} vừa đăng bài viết mới trên diễn đàn.`,
                    type: 'NEW_FORUM_POST',
                    action_url: `/forum/posts/${post._id}`,
                    source: { entity_id: post._id, entity_type: 'FORUM_POST' }
                }));
                await Notification.insertMany(notifications);

                const io = socket.getIo();
                usersToNotify.forEach(u => {
                    io.to(`user_${u._id}`).emit('notification', notifications[0]);
                });
            }
        } catch (notifErr) {
            console.error('Error sending forum post notifications:', notifErr);
        }

        res.status(201).json(post);
    } catch (err) { next(err); }
});

router.delete('/posts/:id', authenticate, async (req, res, next) => {
    try {
        const post = await ForumPost.findById(req.params.id);
        if (!post) return res.status(404).json({ error: 'Post not found' });
        const isOwner = post.author_id?.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'ADMIN';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: 'Không có quyền xoá bài này' });
        }
        await post.deleteOne();
        res.json({ message: 'Bài đăng đã được xoá' });
    } catch (err) { next(err); }
});

// ─── Forum Comments ───────────────────────────────────────────────────────────

router.post('/posts/:id/comments', async (req, res, next) => {
    try {
        const comment = new ForumComment({ post_id: req.params.id, ...req.body });
        await comment.save();

        // Notify post author
        try {
            const post = await ForumPost.findById(req.params.id);
            if (post && post.author_id?.toString() !== req.body.author_id?.toString()) {
                const author = await User.findById(req.body.author_id).select('full_name');
                const postOwner = await User.findById(post.author_id).select('notification_settings');

                if (postOwner && postOwner.notification_settings?.forum_reply) {
                    const notification = {
                        recipient_id: post.author_id,
                        title: 'Phản hồi mới trên diễn đàn',
                        body: `${author?.full_name || 'Ai đó'} vừa phản hồi bài viết của bạn: "${post.title.substring(0, 30)}..."`,
                        type: 'FORUM_REPLY',
                        action_url: `/forum/posts/${post._id}`,
                        source: { entity_id: post._id, entity_type: 'FORUM_POST' }
                    };
                    await Notification.create(notification);

                    const io = socket.getIo();
                    io.to(`user_${post.author_id}`).emit('notification', notification);
                }
            }
        } catch (notifErr) {
            console.error('Error sending forum reply notification:', notifErr);
        }

        res.status(201).json(comment);
    } catch (err) { next(err); }
});

// ─── Forum Votes ──────────────────────────────────────────────────────────────

router.post('/votes', async (req, res, next) => {
    try {
        const { user_id, target_id, target_type, vote_type } = req.body;
        let vote = await ForumVote.findOne({ user_id, target_id, target_type });

        const isPositive = (type) => ['UPVOTE', 'LIKE', 'HEART', 'WOW', 'SAD', 'LAUGH'].includes(type);
        const updateCount = (type, delta) => {
            if (type === 'FORUM_POST') return ForumPost.findByIdAndUpdate(target_id, { $inc: { upvote_count: delta } });
            return ForumComment.findByIdAndUpdate(target_id, { $inc: { upvote_count: delta } });
        };

        if (vote) {
            if (vote.vote_type !== vote_type) {
                // Remove old vote's effect
                if (isPositive(vote.vote_type)) await updateCount(target_type, -1);
                // Add new vote's effect
                if (isPositive(vote_type)) await updateCount(target_type, 1);
                vote.vote_type = vote_type;
                await vote.save();
            } else {
                // Clicking same reaction removes it
                if (isPositive(vote.vote_type)) await updateCount(target_type, -1);
                await vote.deleteOne();
                return res.json({ message: 'Vote removed' });
            }
        } else {
            vote = new ForumVote({ user_id, target_id, target_type, vote_type });
            await vote.save();
            if (isPositive(vote_type)) await updateCount(target_type, 1);
        }
        res.json(vote);
    } catch (err) { next(err); }
});

router.get('/votes/user/:userId', async (req, res, next) => {
    try {
        const votes = await ForumVote.find({ user_id: req.params.userId });
        res.json(votes);
    } catch (err) { next(err); }
});

// ─── Saved Posts ─────────────────────────────────────────────────────────────

router.post('/saved-posts', async (req, res, next) => {
    try {
        const { user_id, post_id } = req.body;
        const saved = new ForumSavedPost({ user_id, post_id, saved_at: new Date() });
        await saved.save();
        res.status(201).json(saved);
    } catch (err) { next(err); }
});

router.delete('/saved-posts', async (req, res, next) => {
    try {
        const { user_id, post_id } = req.query;
        await ForumSavedPost.deleteOne({ user_id, post_id });
        res.json({ message: 'Post unsaved' });
    } catch (err) { next(err); }
});

// ─── Group Feed Comments & Reactions ─────────────────────────────────────────

router.post('/feed-posts/:postId/comments', async (req, res, next) => {
    try {
        const comment = new GroupFeedComment({ feed_post_id: req.params.postId, ...req.body });
        await comment.save();
        await GroupFeedPost.findByIdAndUpdate(req.params.postId, { $inc: { comment_count: 1 } });
        res.status(201).json(comment);
    } catch (err) { next(err); }
});

router.post('/feed-posts/:postId/reactions', async (req, res, next) => {
    try {
        const { user_id, emoji } = req.body;
        const post = await GroupFeedPost.findById(req.params.postId);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        const idx = post.reactions.findIndex(r => r.user_id.toString() === user_id && r.emoji === emoji);
        if (idx >= 0) {
            post.reactions.splice(idx, 1);
            post.reaction_count -= 1;
        } else {
            post.reactions.push({ user_id, emoji, created_at: new Date() });
            post.reaction_count += 1;
        }
        await post.save();
        res.json(post);
    } catch (err) { next(err); }
});

module.exports = router;
