const mongoose = require('mongoose');
const { Quiz } = require('../src/models/Quiz');

async function test() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect('mongodb://localhost:27017/ExLMS');
        console.log('Connected.');

        const course_id = new mongoose.Types.ObjectId();
        const payload = {
            course_id: course_id,
            title: 'Test Questions Validation Error',
            description: '',
            time_limit_sec: 600,
            max_attempts: 1,
            passing_score: 70,
            shuffle_questions: false,
            result_visibility: 'IMMEDIATE',
            quiz_type: 'PRACTICE',
            questions: [
                {
                    content: 'This is a short answer question',
                    question_type: 'SHORT_ANSWER',
                    points: 10,
                    order_index: 0,
                    // Note: answers array has elements with empty content
                    answers: [
                        { content: '', is_correct: true }
                    ]
                }
            ]
        };

        console.log('Attempting to save Quiz with invalid question answers...');
        const quiz = new Quiz(payload);
        await quiz.save();
        console.log('Success! Created Quiz ID:', quiz._id);

    } catch (err) {
        console.error('Error occurred:');
        console.error(err);
    } finally {
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
    }
}

test();
