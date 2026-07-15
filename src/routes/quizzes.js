const ExcelJS = require('exceljs');
const router = require('express').Router();
const multer = require('multer');
const mammoth = require('mammoth');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB maximum file size
    fileFilter: (req, file, cb) => {
        const fileExtension = file.originalname.split('.').pop().toLowerCase();
        const allowedMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (fileExtension !== 'docx' && file.mimetype !== allowedMime) {
            return cb(new Error('Chỉ chấp nhận file Word định dạng .docx'), false);
        }
        cb(null, true);
    }
});

// Scan text for malicious scripts, HTML tag injection, or command execution strings
function scanTextSecurity(text) {
    if (!text) return true;
    const maliciousPatterns = [
        /<script\b[^>]*>([\s\S]*?)<\/script>/gi,
        /javascript:/gi,
        /onload=/gi,
        /onerror=/gi,
        /onclick=/gi,
        /system\s*\(/gi,
        /exec\s*\(/gi,
        /eval\s*\(/gi
    ];
    for (const pattern of maliciousPatterns) {
        if (pattern.test(text)) {
            return false;
        }
    }
    return true;
}

const { Quiz, QuizAttempt } = require('../models/Quiz');
const { CourseEnrollment } = require('../models/Course');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// GET my quiz attempts
router.get('/my-attempts', async (req, res, next) => {
    try {
        const attempts = await QuizAttempt.find({ user_id: req.user._id })
            .populate('quiz_id', 'title quiz_type passing_score')
            .sort({ submitted_at: -1 });
        res.json(attempts);
    } catch (err) { next(err); }
});

// GET quizzes (filter by course_id or chapter_id)
router.get('/', async (req, res, next) => {
    try {
        const { course_id, chapter_id, quiz_type } = req.query;
        const filter = {};
        
        if (chapter_id) filter.chapter_id = chapter_id;
        if (quiz_type) filter.quiz_type = quiz_type;

        if (req.user.role === 'STUDENT') {
            const enrollments = await CourseEnrollment.find({ user_id: req.user._id }).select('course_id');
            const myCourseIds = enrollments.map(e => e.course_id.toString());
            
            if (course_id) {
                if (!myCourseIds.includes(course_id.toString())) {
                    return res.json([]);
                }
                filter.course_id = course_id;
            } else {
                filter.course_id = { $in: myCourseIds };
            }
        } else {
            if (course_id) filter.course_id = course_id;
        }

        const quizzes = await Quiz.find(filter);
        res.json(quizzes);
    } catch (err) { next(err); }
});

// GET exams (quizzes with type EXAM)
router.get('/exams', async (req, res, next) => {
    try {
        const filter = { quiz_type: 'EXAM' };
        
        if (req.user.role === 'STUDENT') {
            const enrollments = await CourseEnrollment.find({ user_id: req.user._id }).select('course_id');
            const myCourseIds = enrollments.map(e => e.course_id.toString());
            filter.course_id = { $in: myCourseIds };
        }

        const exams = await Quiz.find(filter)
            .populate('course_id', 'title');
        res.json(exams);
    } catch (err) { next(err); }
});

// GET analytics overview (admin/instructor only)
router.get('/analytics/overview', authorize('ADMIN', 'INSTRUCTOR'), async (req, res, next) => {
    try {
        const quizzes = await Quiz.find({}).select('title quiz_type passing_score questions created_at');
        const results = await Promise.all(quizzes.map(async (quiz) => {
            const attempts = await QuizAttempt.find({ quiz_id: quiz._id, submitted_at: { $exists: true } });
            const totalAttempts = attempts.length;
            const passedCount = attempts.filter(a => a.is_passed).length;
            const avgScore = totalAttempts > 0
                ? Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / totalAttempts)
                : 0;
            const scoreDistribution = [0, 0, 0, 0, 0]; // 0-20, 21-40, 41-60, 61-80, 81-100
            attempts.forEach(a => {
                const s = a.score || 0;
                if (s <= 20) scoreDistribution[0]++;
                else if (s <= 40) scoreDistribution[1]++;
                else if (s <= 60) scoreDistribution[2]++;
                else if (s <= 80) scoreDistribution[3]++;
                else scoreDistribution[4]++;
            });
            return {
                quiz_id: quiz._id,
                title: quiz.title,
                quiz_type: quiz.quiz_type,
                question_count: quiz.questions.length,
                total_attempts: totalAttempts,
                pass_rate: totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 100) : 0,
                avg_score: avgScore,
                score_distribution: scoreDistribution,
                passing_score: quiz.passing_score,
                created_at: quiz.created_at
            };
        }));
        res.json(results);
    } catch (err) { next(err); }
});

// GET quiz by ID
router.get('/:id', async (req, res, next) => {
    try {
        const quiz = await Quiz.findById(req.params.id).lean();
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
        
        // If user is not ADMIN and not the creator, sanitize sensitive data
        const isCreator = quiz.created_by && quiz.created_by.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'INSTRUCTOR';

        if (!isAdmin && !isCreator) {
            quiz.questions = (quiz.questions || []).map(q => {
                const { explanation, blank_answers, ...rest } = q;
                return {
                    ...rest,
                    answers: Array.isArray(q.answers) ? q.answers.map(a => {
                        const { is_correct, correct_order, ...ansRest } = a;
                        return ansRest;
                    }) : []
                };
            });
        }

        res.json(quiz);
    } catch (err) { next(err); }
});

// GET check attempt (can I take this quiz?)
router.get('/:id/check-attempt', async (req, res, next) => {
    try {
        const user_id = req.user._id;
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
        
        const previousAttempts = await QuizAttempt.countDocuments({ quiz_id: req.params.id, user_id });
        const can_attempt = quiz.max_attempts === 0 || previousAttempts < quiz.max_attempts;
        
        // Find best score if already attempted
        let best_attempt = null;
        if (previousAttempts > 0) {
            best_attempt = await QuizAttempt.findOne({ quiz_id: req.params.id, user_id })
                .sort({ score: -1 });
        }

        res.json({
            can_attempt,
            attempts_count: previousAttempts,
            max_attempts: quiz.max_attempts,
            best_score: best_attempt ? best_attempt.score : null,
            submitted_at: best_attempt ? best_attempt.submitted_at : null
        });
    } catch (err) { next(err); }
});

// GET quiz analytics (admin/instructor)
router.get('/:id/analytics', authorize('ADMIN', 'INSTRUCTOR'), async (req, res, next) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

        const attempts = await QuizAttempt.find({ quiz_id: req.params.id, submitted_at: { $exists: true } })
            .populate('user_id', 'full_name email');

        const totalAttempts = attempts.length;
        const passedCount = attempts.filter(a => a.is_passed).length;
        const avgScore = totalAttempts > 0
            ? Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / totalAttempts)
            : 0;

        // Score distribution in bands of 10
        const scoreDistribution = Array(10).fill(0);
        attempts.forEach(a => {
            const band = Math.min(Math.floor((a.score || 0) / 10), 9);
            scoreDistribution[band]++;
        });

        // Per-question stats
        const questionStats = quiz.questions.map(q => {
            let correctCount = 0;
            attempts.forEach(attempt => {
                const resp = attempt.responses.find(r => r.question_id.toString() === q._id.toString());
                if (resp && resp.is_correct) correctCount++;
            });
            return {
                question_id: q._id,
                content: q.content,
                question_type: q.question_type,
                correct_count: correctCount,
                total_count: totalAttempts,
                correct_rate: totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0
            };
        });

        // Recent attempts
        const recentAttempts = attempts.slice(0, 20).map(a => ({
            _id: a._id,
            user: a.user_id,
            score: a.score,
            is_passed: a.is_passed,
            attempt_number: a.attempt_number,
            submitted_at: a.submitted_at,
            time_spent_sec: a.time_spent_sec,
            cheat_detected: a.cheat_detected,
            violations: a.violations || []
        }));

        res.json({
            quiz: { title: quiz.title, quiz_type: quiz.quiz_type, passing_score: quiz.passing_score, enable_anti_cheat: quiz.enable_anti_cheat },
            total_attempts: totalAttempts,
            pass_rate: totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 100) : 0,
            avg_score: avgScore,
            score_distribution: scoreDistribution,
            question_stats: questionStats,
            recent_attempts: recentAttempts
        });
    } catch (err) { next(err); }
});

// GET specific attempt result (for result review page)
router.get('/:id/attempts/:attemptId', async (req, res, next) => {
    try {
        const attempt = await QuizAttempt.findById(req.params.attemptId);
        if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

        // Only allow the owner or admin to view
        const isOwner = attempt.user_id.toString() === req.user._id.toString();
        const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'INSTRUCTOR';
        if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' });

        // Get the quiz WITH correct answers for review
        const quiz = await Quiz.findById(req.params.id).lean();
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

        const quizMaxScore = quiz.questions.reduce((acc, q) => acc + (q.points || 0), 0);

        // Build detailed review data
        const reviewData = quiz.questions.map(q => {
            const response = attempt.responses.find(r => r.question_id.toString() === q._id.toString());
            
            // Build user answer display
            let userAnswer = null;
            let correctAnswer = null;

            if (q.question_type === 'SINGLE_CHOICE' || q.question_type === 'TRUE_FALSE') {
                const selectedAns = q.answers.find(a => a._id.toString() === response?.selected_answer_id?.toString());
                const correctAns = q.answers.find(a => a.is_correct);
                userAnswer = selectedAns?.content || null;
                correctAnswer = correctAns?.content || null;
            } else if (q.question_type === 'MULTIPLE_CHOICE') {
                const selectedIds = (response?.selected_answer_ids || []).map(id => id.toString());
                userAnswer = q.answers.filter(a => selectedIds.includes(a._id.toString())).map(a => a.content);
                correctAnswer = q.answers.filter(a => a.is_correct).map(a => a.content);
            } else if (q.question_type === 'FILL_BLANK') {
                userAnswer = response?.text_response || null;
                correctAnswer = q.blank_answers || [];
            } else if (q.question_type === 'ORDERING') {
                const orderedIds = (response?.order_response || []).map(id => id.toString());
                userAnswer = orderedIds.map(id => q.answers.find(a => a._id.toString() === id)?.content).filter(Boolean);
                const correctOrdered = [...q.answers].sort((a, b) => (a.correct_order || 0) - (b.correct_order || 0));
                correctAnswer = correctOrdered.map(a => a.content);
            } else if (q.question_type === 'SHORT_ANSWER') {
                userAnswer = response?.text_response || null;
                correctAnswer = null; // manual grading
            }

            return {
                question_id: q._id,
                content: q.content,
                question_type: q.question_type,
                points: q.points,
                media_type: q.media_type,
                media_url: q.media_url,
                explanation: q.explanation,
                answers: q.answers,
                blank_answers: q.blank_answers,
                is_correct: response?.is_correct || false,
                points_earned: response?.points_earned || 0,
                user_answer: userAnswer,
                correct_answer: correctAnswer
            };
        });

        res.json({
            attempt: {
                _id: attempt._id,
                score: attempt.score,
                is_passed: attempt.is_passed,
                attempt_number: attempt.attempt_number,
                started_at: attempt.started_at,
                submitted_at: attempt.submitted_at,
                time_spent_sec: attempt.time_spent_sec,
                cheat_detected: attempt.cheat_detected,
                violations: attempt.violations || []
            },
            quiz: {
                title: quiz.title,
                passing_score: quiz.passing_score,
                max_score: quizMaxScore,
                enable_anti_cheat: quiz.enable_anti_cheat
            },
            review: reviewData,
            summary: {
                correct: reviewData.filter(r => r.is_correct).length,
                incorrect: reviewData.filter(r => !r.is_correct && r.question_type !== 'SHORT_ANSWER').length,
                skipped: reviewData.filter(r => r.user_answer === null || (Array.isArray(r.user_answer) && r.user_answer.length === 0)).length
            }
        });
    } catch (err) { next(err); }
});

// POST create quiz
router.post('/', async (req, res, next) => {
    try {
        if (req.body.access_code === '') delete req.body.access_code;
        const quiz = new Quiz({
            ...req.body,
            created_by: req.user._id
        });
        await quiz.save();
        res.status(201).json(quiz);
    } catch (err) { 
        console.error('Lỗi khi tạo quiz:', err);
        next(err); 
    }
});

// PUT update quiz
router.put('/:id', async (req, res, next) => {
    try {
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

        const isAdmin = req.user.role === 'ADMIN';
        const isCreator = !quiz.created_by || (quiz.created_by.toString() === req.user._id.toString());

        if (!isAdmin && !isCreator) {
            return res.status(403).json({ error: 'Bạn không có quyền cập nhật bài kiểm tra này' });
        }

        const updateData = { ...req.body };
        if (updateData.access_code === '') {
            delete updateData.access_code;
            updateData.$unset = { access_code: 1 };
        }
        const updatedQuiz = await Quiz.findByIdAndUpdate(
            req.params.id, 
            updateData, 
            { new: true, runValidators: true }
        );
        res.json(updatedQuiz);
    } catch (err) { next(err); }
});

/**
 * Grade a single question response
 */
function gradeQuestion(question, response) {
    if (!response) return { isCorrect: false, pointsEarned: 0 };

    let isCorrect = false;
    let pointsEarned = 0;

    if (question.question_type === 'SINGLE_CHOICE' || question.question_type === 'TRUE_FALSE') {
        const correctAnswer = question.answers.find(a => a.is_correct);
        isCorrect = correctAnswer && (correctAnswer._id.toString() === String(response.selected_answer_id));
        pointsEarned = isCorrect ? (question.points || 0) : 0;

    } else if (question.question_type === 'MULTIPLE_CHOICE') {
        const correctIds = question.answers.filter(a => a.is_correct).map(a => a._id.toString()).sort();
        const selectedIds = (response.selected_answer_ids || (response.selected_answer_id ? [response.selected_answer_id] : []))
            .map(id => String(id)).sort();
        isCorrect = correctIds.length > 0 &&
                   correctIds.length === selectedIds.length &&
                   correctIds.every((id, idx) => id === selectedIds[idx]);
        pointsEarned = isCorrect ? (question.points || 0) : 0;

    } else if (question.question_type === 'FILL_BLANK') {
        const userText = (response.text_response || '').trim().toLowerCase();
        const acceptedAnswers = (question.blank_answers || []).map(a => a.trim().toLowerCase());
        isCorrect = acceptedAnswers.length > 0 && acceptedAnswers.includes(userText);
        pointsEarned = isCorrect ? (question.points || 0) : 0;

    } else if (question.question_type === 'ORDERING') {
        // User provides order_response: array of answer IDs in their ordered sequence
        const userOrder = (response.order_response || []).map(id => String(id));
        // Sort answers by correct_order to get the correct sequence
        const correctOrder = [...question.answers]
            .sort((a, b) => (a.correct_order || 0) - (b.correct_order || 0))
            .map(a => a._id.toString());
        isCorrect = correctOrder.length > 0 &&
                    correctOrder.length === userOrder.length &&
                    correctOrder.every((id, idx) => id === userOrder[idx]);
        pointsEarned = isCorrect ? (question.points || 0) : 0;

    } else if (question.question_type === 'SHORT_ANSWER') {
        // Manual grading – always 0 initially
        isCorrect = false;
        pointsEarned = 0;
    }

    return { isCorrect, pointsEarned };
}

// POST submit quiz attempt
router.post('/:id/attempts', async (req, res, next) => {
    try {
        const { responses = [], time_spent_sec, violations = [], cheat_detected = false } = req.body;
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
            time_spent_sec: time_spent_sec || null,
            cheat_detected: cheat_detected || (violations.length > 0),
            violations: violations,
            responses: []
        });

        let totalScore = 0;
        const quizMaxScore = quiz.questions.reduce((acc, q) => acc + (q.points || 0), 0);

        // Map responses for easy lookup
        const respMap = new Map();
        responses.forEach(r => {
            if (r.question_id) respMap.set(r.question_id.toString(), r);
        });

        for (const question of quiz.questions) {
            const qId = question._id.toString();
            const response = respMap.get(qId);
            const { isCorrect, pointsEarned } = gradeQuestion(question, response);

            attempt.responses.push({
                question_id: question._id,
                selected_answer_id: response?.selected_answer_id,
                selected_answer_ids: response?.selected_answer_ids,
                order_response: response?.order_response,
                text_response: response?.text_response,
                is_correct: isCorrect,
                points_earned: pointsEarned
            });

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
                earnedScore: totalScore,
                attempt_id: attempt._id
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
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
        
        // Authorization check
        const isAdmin = req.user.role === 'ADMIN';
        const isCreator = !quiz.created_by || (quiz.created_by.toString() === req.user._id.toString());
        
        if (!isAdmin && !isCreator) {
            return res.status(403).json({ error: 'Bạn không có quyền xóa bài kiểm tra này' });
        }

        await Quiz.findByIdAndDelete(req.params.id);
        
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
        const headers = ['Họ và tên', 'Email', 'Lượt làm', 'Điểm số (%)', 'Số đúng', 'Thời gian (s)', 'Thời gian nộp', 'Trạng thái', 'Gian lận', 'Số lần vi phạm'];
        
        const rows = attempts.map(a => {
            const correctCount = a.responses.filter(r => r.is_correct).length;
            return [
                a.user_id?.full_name || 'N/A',
                a.user_id?.email || 'N/A',
                a.attempt_number || 1,
                a.score != null ? a.score : 0,
                correctCount,
                a.time_spent_sec || 'N/A',
                a.submitted_at ? new Date(a.submitted_at).toLocaleString('vi-VN') : 'N/A',
                a.is_passed ? 'ĐẠT' : 'CHƯA ĐẠT',
                a.cheat_detected ? 'CÓ' : 'KHÔNG',
                a.violations ? a.violations.length : 0
            ];
        });

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

// POST generate questions using Gemini API
router.post('/generate-questions', authorize('ADMIN', 'INSTRUCTOR'), async (req, res, next) => {
    try {
        const { topic, amount = 5, types = ['SINGLE_CHOICE'], difficulty = 'MEDIUM', apiKey } = req.body;
        const finalApiKey = apiKey || process.env.GEMINI_API_KEY;

        if (!finalApiKey) {
            return res.status(400).json({ error: 'Vui lòng cấu hình GEMINI_API_KEY trong file .env hoặc nhập mã API Key trực tiếp tại giao diện.' });
        }

        if (!topic || topic.trim() === '') {
            return res.status(400).json({ error: 'Vui lòng cung cấp chủ đề hoặc nội dung tài liệu để sinh câu hỏi.' });
        }

        const prompt = `Bạn là một chuyên gia khảo thí giáo dục. Hãy tạo ra đúng ${amount} câu hỏi trắc nghiệm/tự luận về chủ đề/tài liệu sau:
Topic/Content: "${topic}"
Độ khó: ${difficulty}
Các loại câu hỏi được phép tạo: ${types.join(', ')}

Định dạng đầu ra PHẢI là một JSON Array hợp lệ chứa các câu hỏi theo cấu trúc sau. KHÔNG thêm bất kỳ giải thích, markdown fence (\`\`\`json) hay văn bản thừa nào bên ngoài JSON. Chỉ trả về JSON thuần túy.

Cấu trúc JSON Schema của mỗi phần tử câu hỏi trong Array:
- content: string (Nội dung câu hỏi)
- question_type: string (Chỉ nhận một trong các giá trị: 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK', 'ORDERING', 'SHORT_ANSWER')
- points: number (Số điểm cho câu hỏi, mặc định 10)
- explanation: string (Giải thích vì sao đáp án đúng hoặc gợi ý chấm điểm)
- answers: array (Danh sách các lựa chọn đáp án, RỖNG đối với 'FILL_BLANK' và 'SHORT_ANSWER'):
  - content: string (Nội dung lựa chọn)
  - is_correct: boolean (Lựa chọn này có đúng không)
  - correct_order: number (Chỉ dùng cho 'ORDERING', bắt đầu từ 0 đến N-1 thể hiện thứ tự đúng của các bước. Với các loại câu hỏi khác thì không cần trường này)
- blank_answers: array (Mảng các chuỗi đáp án đúng chấp nhận được, CHỈ dùng cho 'FILL_BLANK'. Ví dụ: ["Hà Nội"]. Với các loại câu hỏi khác thì không cần trường này)

Lưu ý quan trọng:
1. Đối với TRUE_FALSE, luôn có đúng 2 lựa chọn trong answers: "Đúng" và "Sai".
2. Đối với SINGLE_CHOICE, luôn có từ 3 đến 4 lựa chọn, trong đó có duy nhất 1 lựa chọn is_correct = true.
3. Đối với MULTIPLE_CHOICE, có từ 4 lựa chọn trở lên, có ít nhất 2 lựa chọn is_correct = true.
4. Đối với FILL_BLANK, hãy để ký tự [blank] trong câu hỏi đại diện cho vị trí điền khuyết. Ví dụ: "Thủ đô của Việt Nam là [blank].".
5. Chỉ tạo ra các loại câu hỏi nằm trong danh sách yêu cầu: ${types.join(', ')}.`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${finalApiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: 'application/json'
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Gemini API Error details:', errText);
            return res.status(response.status).json({ error: `Lỗi kết nối Gemini API: ${response.statusText}` });
        }

        const resData = await response.json();
        const textResult = resData.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!textResult) {
            return res.status(500).json({ error: 'Không nhận được dữ liệu hợp lệ từ Gemini API.' });
        }

        try {
            const parsedQuestions = JSON.parse(textResult);
            if (!Array.isArray(parsedQuestions)) {
                return res.status(500).json({ error: 'Định dạng phản hồi từ AI không phải là danh sách câu hỏi.' });
            }
            res.json(parsedQuestions);
        } catch (parseErr) {
            console.error('Failed to parse Gemini output:', textResult, parseErr);
            return res.status(500).json({ error: 'Lỗi phân giải cấu trúc JSON nhận được từ AI.' });
        }
    } catch (err) {
        next(err);
    }
});

// POST generate questions from Word (.docx) file using Gemini API
router.post('/generate-from-file', authorize('ADMIN', 'INSTRUCTOR'), upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Vui lòng tải lên một tệp tin Word (.docx).' });
        }

        // Validate file size manually as safety fallback
        if (req.file.size > 10 * 1024 * 1024) {
            return res.status(400).json({ error: 'Kích thước file vượt quá giới hạn cho phép (tối đa 10MB).' });
        }
        
        const { amount = 5, types = ['SINGLE_CHOICE'], difficulty = 'MEDIUM', apiKey } = req.body;
        const parsedTypes = Array.isArray(types) ? types : (typeof types === 'string' ? JSON.parse(types) : ['SINGLE_CHOICE']);
        const finalApiKey = apiKey || process.env.GEMINI_API_KEY;

        if (!finalApiKey) {
            return res.status(400).json({ error: 'Vui lòng cấu hình GEMINI_API_KEY trong file .env hoặc nhập mã API Key trực tiếp tại giao diện.' });
        }

        // Parse docx using mammoth
        let textResultDoc;
        try {
            const result = await mammoth.extractRawText({ buffer: req.file.buffer });
            textResultDoc = result.value;
        } catch (err) {
            return res.status(400).json({ error: 'Không thể đọc nội dung file Word (.docx). Vui lòng kiểm tra lại file.' });
        }

        if (!textResultDoc || textResultDoc.trim() === '') {
            return res.status(400).json({ error: 'File Word rỗng hoặc không chứa văn bản đọc được.' });
        }

        // Perform security check
        if (!scanTextSecurity(textResultDoc)) {
            return res.status(400).json({ error: 'Phát hiện nội dung không an toàn (HTML script hoặc câu lệnh thực thi) trong tài liệu của bạn.' });
        }

        const prompt = `Bạn là một chuyên gia khảo thí giáo dục. Hãy phân tích nội dung tài liệu hoặc đề thi Word sau và trích xuất hoặc thiết kế ra đề thi có cấu trúc hoàn chỉnh.

Nội dung tài liệu/đề thi Word:
"""
${textResultDoc}
"""

Hãy trích xuất thông tin chung và danh sách câu hỏi theo các quy tắc sau:
1. Thông tin chung:
   - Tìm kiếm thông tin môn học, lớp học, tiêu đề, mô tả và thời gian làm bài ở phần đầu văn bản (ví dụ "Môn học: ...", "Thời gian: ... phút").
   - Tạo trường 'title' (Tiêu đề đề thi) từ môn học và lớp học hoặc tiêu đề tìm thấy (ví dụ: "Đề thi môn Lập trình Web - Lớp K65"). Nếu không thấy thông tin môn học hoặc tiêu đề, hãy tự đặt một tiêu đề phù hợp ngắn gọn dựa trên nội dung các câu hỏi.
   - Tạo trường 'description' (Mô tả đề thi) tóm tắt về đề thi và lớp học/môn học.
   - Tìm thời gian làm bài (ví dụ "60 phút", "90 minutes") và quy đổi ra giây để lưu vào trường 'time_limit_sec' (ví dụ 60 phút = 3600, 90 phút = 5400). Nếu không tìm thấy hoặc không giới hạn, để là null.
2. Danh sách câu hỏi:
   - Trích xuất tối đa ${amount} câu hỏi từ đề thi.
   - Các loại câu hỏi được phép tạo: ${parsedTypes.join(', ')}.
   - Độ khó mục tiêu: ${difficulty}.

Định dạng đầu ra PHẢI là một JSON Object duy nhất có cấu trúc sau. KHÔNG thêm bất kỳ giải thích, markdown fence (\`\`\`json) hay văn bản thừa nào bên ngoài JSON. Chỉ trả về JSON thuần túy.

Cấu trúc JSON Schema của kết quả:
{
  "title": "string (Tiêu đề đề thi)",
  "description": "string (Mô tả đề thi)",
  "time_limit_sec": number hoặc null (Thời gian làm bài tính bằng giây)",
  "questions": [
    {
      "content": "string (Nội dung câu hỏi)",
      "question_type": "string (Một trong các giá trị: 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_BLANK', 'ORDERING', 'SHORT_ANSWER')",
      "points": number (Số điểm của câu hỏi, mặc định 10),
      "explanation": "string (Giải thích vì sao đúng, gợi ý chấm điểm hoặc để trống)",
      "answers": [
        {
          "content": "string (Nội dung lựa chọn)",
          "is_correct": boolean (Lựa chọn đúng hay sai),
          "correct_order": number (Chỉ dùng cho 'ORDERING', thứ tự đúng từ 0 đến N-1)
        }
      ],
      "blank_answers": ["string (Các đáp án đúng cho điền khuyết)"]
    }
  ]
}

Lưu ý:
- Đối với TRUE_FALSE, luôn có đúng 2 lựa chọn trong answers: "Đúng" và "Sai".
- Đối với SINGLE_CHOICE, luôn có từ 3 đến 4 lựa chọn, trong đó có duy nhất 1 lựa chọn is_correct = true.
- Đối với MULTIPLE_CHOICE, có từ 4 lựa chọn trở lên, có ít nhất 2 lựa chọn is_correct = true.
- Đối với FILL_BLANK, hãy để ký tự [blank] trong câu hỏi đại diện cho vị trí điền khuyết.
- Đối với SHORT_ANSWER (tự luận), trường answers và blank_answers để trống.`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${finalApiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: 'application/json'
                }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Gemini API Error details:', errText);
            return res.status(response.status).json({ error: `Lỗi kết nối Gemini API: ${response.statusText}` });
        }

        const resData = await response.json();
        const textResult = resData.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!textResult) {
            return res.status(500).json({ error: 'Không nhận được dữ liệu hợp lệ từ Gemini API.' });
        }

        try {
            const parsedData = JSON.parse(textResult);
            if (!parsedData.title || !Array.isArray(parsedData.questions)) {
                return res.status(500).json({ error: 'Định dạng phản hồi từ AI không đúng cấu trúc đề thi.' });
            }
            res.json(parsedData);
        } catch (parseErr) {
            console.error('Failed to parse Gemini output:', textResult, parseErr);
            return res.status(500).json({ error: 'Lỗi phân giải cấu trúc JSON nhận được từ AI.' });
        }

    } catch (err) {
        next(err);
    }
});

module.exports = router;
