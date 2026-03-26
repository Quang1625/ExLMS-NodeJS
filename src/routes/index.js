const router = require('express').Router();
const mongoose = require('mongoose');

// Health check
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date(),
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Auth routes (public)
router.use('/auth',          require('./auth'));

// Feature routes
router.use('/users',           require('./users'));
router.use('/study-groups',    require('./studyGroups'));
router.use('/courses',         require('./courses'));
router.use('/enrollments',     require('./enrollments'));
router.use('/quizzes',         require('./quizzes'));
router.use('/quiz-rooms',      require('./quizRooms'));
router.use('/assignments',     require('./assignments'));
router.use('/submissions',     require('./assignments'));   // grade endpoint lives here
router.use('/meetings',        require('./meetings'));
router.use('/notifications',   require('./notifications'));
router.use('/calendar-events', require('./calendar'));
router.use('/forum',           require('./forum'));
router.use('/feed-posts',      require('./forum'));         // feed post comments & reactions
router.use('/groups',          require('./studyGroups'));   // group feed: /groups/:groupId/feed

module.exports = router;
