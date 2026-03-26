require('dotenv').config();
const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const { Quiz, QuizAttempt } = require('./src/models/Quiz');
const fs = require('fs');

async function test() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ExLMS');
    console.log('Connected to DB');

    const quizId = '69c2812435c6a4dbbb60dbf7';
    
    const quiz = await Quiz.findById(quizId);
    if (!quiz) { console.log('Quiz not found!'); process.exit(1); }
    console.log('Quiz found:', quiz.title);

    const attempts = await QuizAttempt.find({ quiz_id: quizId })
        .populate('user_id', 'full_name email')
        .sort({ submitted_at: -1 });
    console.log('Attempts found:', attempts.length);

    try {
        const workbook = new ExcelJS.Workbook();
        const safeName = (quiz.title || 'Quiz').replace(/[\\/*?[\]]/g, '').substring(0, 28);
        console.log('Sheet name:', JSON.stringify(safeName));
        const worksheet = workbook.addWorksheet(safeName || 'BangDiem');

        worksheet.columns = [
            { header: 'Ho va ten', key: 'name', width: 25 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Diem so', key: 'score', width: 15 },
            { header: 'Thoi gian', key: 'time', width: 25 },
            { header: 'Trang thai', key: 'status', width: 15 },
            { header: 'Ghi chu', key: 'notes', width: 30 }
        ];

        for (const attempt of attempts) {
            worksheet.addRow({
                name: attempt.user_id?.full_name || 'N/A',
                email: attempt.user_id?.email || 'N/A',
                score: attempt.score != null ? attempt.score : 0,
                time: attempt.submitted_at ? attempt.submitted_at.toISOString() : 'N/A',
                status: attempt.is_passed ? 'DAT' : 'CHUA DAT',
                notes: attempt.notes || ''
            });
        }

        worksheet.getRow(1).font = { bold: true };

        const buffer = await workbook.xlsx.writeBuffer();
        fs.writeFileSync('test_output.xlsx', buffer);
        console.log('✅ SUCCESS! File size:', buffer.length, 'bytes. Saved to test_output.xlsx');
    } catch (err) {
        console.error('❌ FAILED:', err.message);
        console.error(err.stack);
    }

    await mongoose.connection.close();
}
test();
