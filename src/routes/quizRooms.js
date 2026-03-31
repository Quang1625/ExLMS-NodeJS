const router = require('express').Router();
const QuizRoom = require('../models/QuizRoom');
const { Quiz } = require('../models/Quiz');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET my quiz history (hosted or joined)
router.get('/my-history', async (req, res, next) => {
    try {
        const userId = req.user._id;
        const rooms = await QuizRoom.find({
            $or: [
                { host_id: userId },
                { 'players.user_id': userId }
            ]
        })
        .populate('quiz_id', 'title')
        .populate('host_id', 'full_name')
        .sort({ created_at: -1 });

        res.json(rooms);
    } catch (err) { next(err); }
});

// Helper: Generate unique 6-char code
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// POST create quiz room
router.post('/', async (req, res, next) => {
    try {
        const { quiz_id, host_id, settings } = req.body;
        
        // Ensure quiz exists
        const quiz = await Quiz.findById(quiz_id);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

        let room_code = generateRoomCode();
        // Check uniqueness (simple retry)
        let exists = await QuizRoom.findOne({ room_code });
        while (exists) {
            room_code = generateRoomCode();
            exists = await QuizRoom.findOne({ room_code });
        }

        const room = new QuizRoom({
            room_code,
            quiz_id,
            host_id,
            settings: settings || { time_per_question: 30, auto_advance: false }
        });

        await room.save();
        res.status(201).json(room);
    } catch (err) { next(err); }
});

// GET room by code
router.get('/:code', async (req, res, next) => {
    try {
        const room = await QuizRoom.findOne({ room_code: req.params.code.toUpperCase() })
            .populate('quiz_id', 'title questions.content questions.points questions.question_type questions.answers questions.video_url questions.media_type questions.media_url')
            .populate('host_id', 'full_name')
            .lean();

        if (!room) return res.status(404).json({ error: 'Room not found' });
        
        // If user is not the HOST and not ADMIN, sanitize sensitive quiz data
        const isHost = room.host_id && room.host_id._id.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'ADMIN';

        if (!isAdmin && !isHost && room.quiz_id && room.quiz_id.questions) {
            room.quiz_id.questions = room.quiz_id.questions.map(q => {
                const { explanation, ...rest } = q;
                return {
                    ...rest,
                    answers: q.answers ? q.answers.map(a => {
                        const { is_correct, ...ansRest } = a;
                        return ansRest;
                    }) : []
                };
            });
        }

        res.json(room);
    } catch (err) { next(err); }
});

// GET room results
router.get('/:code/results', async (req, res, next) => {
    try {
        const room = await QuizRoom.findOne({ room_code: req.params.code.toUpperCase() });
        if (!room) return res.status(404).json({ error: 'Room not found' });
        
        // Sort players by score
        const leaderboard = room.players.sort((a, b) => b.score - a.score);
        res.json(leaderboard);
    } catch (err) { next(err); }
});

module.exports = router;
