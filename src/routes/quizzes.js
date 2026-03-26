const ExcelJS = require('exceljs');
const router = require('express').Router();
const { Quiz, QuizAttempt } = require('../models/Quiz');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET my quiz attempts
router.get('/my-attempts', async (req, res, next) => {
    try {
        const attempts = await QuizAttempt.find({ user_id: req.user._id })
            .populate('quiz_id', 'title')
            .sort({ submitted_at: -1 });
        res.json(attempts);
    } catch (err) { next(err); }
});

// GET quizzes (filter by course_id or chapter_id)
router.get('/', async (req, res, next) => {
    try {
        const { course_id, chapter_id, quiz_type } = req.query;
        const filter = {};
        if (course_id) filter.course_id = course_id;
        if (chapter_id) filter.chapter_id = chapter_id;
        if (quiz_type) filter.quiz_type = quiz_type;
        const quizzes = await Quiz.find(filter);
        res.json(quizzes);
    } catch (err) { next(err); }
});

// GET quiz by ID
router.get('/:id', async (req, res, next) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
        res.json(quiz);
    } catch (err) { next(err); }
});

// POST create quiz
router.post('/', async (req, res, next) => {
    try {
        const quiz = new Quiz(req.body);
        await quiz.save();
        res.status(201).json(quiz);
    } catch (err) { next(err); }
});

// PUT update quiz
router.put('/:id', async (req, res, next) => {
    try {
        const quiz = await Quiz.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
        res.json(quiz);
    } catch (err) { next(err); }
});

// POST submit quiz attempt
router.post('/:id/attempts', async (req, res, next) => {
    try {
        const responses = req.body.responses || [];
        const user_id = req.user._id; 
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

        const previousAttempts = await QuizAttempt.countDocuments({ quiz_id: req.params.id, user_id });
        const attemptNumber = previousAttempts + 1;
        
        if (quiz.max_attempts > 0 && attemptNumber > quiz.max_attempts) {
            return res.status(400).json({ error: `Bạn đã đạt số lần làm bài tối đa (${quiz.max_attempts}).` });
        }

        const attempt = new QuizAttempt({
            quiz_id: req.params.id, 
            user_id, 
            attempt_number: attemptNumber, 
            responses: []
        });

        let totalScore = 0;
        const quizMaxScore = quiz.questions.reduce((acc, q) => acc + (q.points || 0), 0);

        // Map responses for easy lookup
        const respMap = new Map(responses.map(r => [r.question_id, r]));

        for (const question of quiz.questions) {
            const response = respMap.get(question._id.toString());
            let isCorrect = false, pointsEarned = 0;

            if (response) {
                if (question.question_type === 'SINGLE_CHOICE' || question.question_type === 'TRUE_FALSE') {
                    const correctAnswer = question.answers.find(a => a.is_correct);
                    isCorrect = correctAnswer && correctAnswer._id.toString() === response.selected_answer_id;
                    pointsEarned = isCorrect ? question.points : 0;
                } else if (question.question_type === 'MULTIPLE_CHOICE') {
                    const correctAnswers = question.answers.filter(a => a.is_correct).map(a => a._id.toString());
                    const selectedAnswers = response.selected_answer_ids || [];
                    isCorrect = correctAnswers.length > 0 && correctAnswers.every(id => selectedAnswers.includes(id))
                        && selectedAnswers.every(id => correctAnswers.includes(id));
                    pointsEarned = isCorrect ? question.points : 0;
                }

                attempt.responses.push({
                    question_id: question._id,
                    selected_answer_id: response.selected_answer_id,
                    selected_answer_ids: response.selected_answer_ids,
                    text_response: response.text_response,
                    is_correct: isCorrect,
                    points_earned: pointsEarned
                });
            } else {
                // Not answered
                attempt.responses.push({
                    question_id: question._id,
                    is_correct: false,
                    points_earned: 0
                });
            }
            totalScore += pointsEarned;
        }

        attempt.score = quizMaxScore > 0 ? Math.round((totalScore / quizMaxScore) * 100) : 0;
        attempt.is_passed = attempt.score >= quiz.passing_score;
        attempt.submitted_at = new Date();
        
        try {
            await attempt.save();
        } catch (saveErr) {
            console.error('QuizAttempt Save Error:', saveErr);
            return res.status(400).json({ error: 'Lỗi lưu bài làm: ' + saveErr.message });
        }

        res.status(201).json({ 
            attempt, 
            result: { 
                score: attempt.score, 
                passed: attempt.is_passed, 
                maxScore: quizMaxScore, 
                earnedScore: totalScore 
            } 
        });
    } catch (err) { 
        console.error('Quiz Submission Error:', err);
        next(err); 
    }
});

// DELETE quiz
router.delete('/:id', async (req, res, next) => {
    try {
        const quiz = await Quiz.findByIdAndDelete(req.params.id);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
        
        // Also delete any associated attempts
        await QuizAttempt.deleteMany({ quiz_id: req.params.id });

        res.json({ message: 'Quiz deleted successfully' });
    } catch (err) { next(err); }
});

// EXPORT quiz results to Excel-compatible CSV
router.get('/:id/export-excel', async (req, res, next) => {
    try {
        if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
            return res.status(400).json({ error: 'Invalid quiz ID' });
        }
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

        const attempts = await QuizAttempt.find({ quiz_id: req.params.id })
            .populate('user_id', 'full_name email')
            .sort({ submitted_at: -1 });

        // Build CSV with BOM for Excel UTF-8 support
        const BOM = '\uFEFF';
        const headers = ['Họ và tên', 'Email', 'Điểm số (%)', 'Thời gian nộp', 'Trạng thái', 'Ghi chú'];
        
        const rows = attempts.map(a => [
            a.user_id?.full_name || 'N/A',
            a.user_id?.email || 'N/A',
            a.score != null ? a.score : 0,
            a.submitted_at ? new Date(a.submitted_at).toLocaleString('vi-VN') : 'N/A',
            a.is_passed ? 'ĐẠT' : 'CHƯA ĐẠT',
            a.notes || ''
        ]);

        const csvContent = BOM + [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const safeTitle = (quiz.title || 'Quiz').replace(/[^a-zA-Z0-9]/g, '_');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=Bang_diem_${safeTitle}.csv`);
        res.send(csvContent);
    } catch (err) {
        console.error('Export Error:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Export failed: ' + err.message });
        }
    }
});

module.exports = router;

