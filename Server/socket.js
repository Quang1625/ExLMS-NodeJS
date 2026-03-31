const socketIo = require('socket.io');

let io;
const allowedOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

const corsOrigin = allowedOrigins.length
    ? allowedOrigins
    : true;

module.exports = {
    init: (server) => {
        io = socketIo(server, {
            cors: {
                origin: corsOrigin,
                methods: ['GET', 'POST', 'PUT', 'DELETE'],
                credentials: true
            }
        });

        io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);

            socket.on('join_user_room', (userId) => {
                socket.join(`user_${userId}`);
                console.log(`Socket ${socket.id} joined user_${userId}`);
            });

            socket.on('join_group', (groupId) => {
                socket.join(`group_${groupId}`);
                console.log(`Socket ${socket.id} joined group_${groupId}`);
            });

            // ── Quiz Events ─────────────────────────────────────────────────────────────

            socket.on('quiz:join_room', async ({ roomCode, userId, name }) => {
                const QuizRoom = require('../src/models/QuizRoom');
                const room = await QuizRoom.findOne({ room_code: roomCode.toUpperCase() });
                if (room) {
                    socket.join(`quiz_room_${roomCode.toUpperCase()}`);

                    // Only add if not already in
                    const playerExists = room.players.some(p => p.user_id?.toString() === userId?.toString());
                    if (!playerExists) {
                        room.players.push({ user_id: userId, name, score: 0, is_connected: true });
                        await room.save();
                    } else {
                        // Mark as connected if they re-joined
                        await QuizRoom.updateOne(
                            { room_code: roomCode.toUpperCase(), 'players.user_id': userId },
                            { $set: { 'players.$.is_connected': true } }
                        );
                    }

                    const updatedRoom = await QuizRoom.findOne({ room_code: roomCode.toUpperCase() });
                    io.to(`quiz_room_${roomCode.toUpperCase()}`).emit('quiz:player_joined', updatedRoom.players);
                }
            });

            socket.on('quiz:host_start', async ({ roomCode }) => {
                const QuizRoom = require('../src/models/QuizRoom');
                const room = await QuizRoom.findOne({ room_code: roomCode.toUpperCase() });
                if (room && room.status === 'LOBBY') {
                    room.status = 'IN_PROGRESS';
                    room.current_question_index = 0;
                    await room.save();
                    io.to(`quiz_room_${roomCode.toUpperCase()}`).emit('quiz:started', {
                        questionIndex: 0,
                        timeLimit: room.settings.time_per_question
                    });
                }
            });

            socket.on('quiz:submit_answer', async ({ roomCode, userId, questionId, answerId }) => {
                const QuizRoom = require('../src/models/QuizRoom');
                try {
                    const room = await QuizRoom.findOne({ room_code: roomCode.toUpperCase() }).populate('quiz_id');
                    if (!room || room.status !== 'IN_PROGRESS') return;

                    const player = room.players.find(p => p.user_id.toString() === userId);
                    if (!player) return;

                    // Prevent multiple answers for the same question
                    const alreadyAnswered = player.answered_questions?.some(qId => qId.toString() === questionId);
                    if (alreadyAnswered) return;

                    const quiz = room.quiz_id;
                    const question = quiz.questions.id(questionId);
                    if (!question) {
                        console.log(`Quiz Error: Question ${questionId} not found in Room ${roomCode}`);
                        return;
                    }

                    // Robust matching for any correct answer
                    const isCorrect = question.answers.some(a => a.is_correct && a._id.toString() === answerId);
                    
                    console.log(`- Quiz Play Status [Room ${roomCode}]:`);
                    console.log(`  User: ${player.name} (${userId})`);
                    console.log(`  Question Content: ${question.content.substring(0, 30)}...`);
                    console.log(`  Received Answer ID: ${answerId}`);
                    console.log(`  Correct Answers IDs: ${question.answers.filter(a => a.is_correct).map(a => a._id.toString()).join(', ')}`);
                    console.log(`  Result: ${isCorrect ? 'Correct ✅' : 'Incorrect ❌'}`);

                    const pointsAwarded = isCorrect ? (question.points || 1) : 0;

                    // Update player score and mark question as answered
                    await QuizRoom.updateOne(
                        { room_code: roomCode.toUpperCase(), 'players.user_id': userId },
                        {
                            $inc: { 'players.$.score': pointsAwarded },
                            $push: { 'players.$.answered_questions': questionId },
                            $set: { 'players.$.last_answer_at': new Date() }
                        }
                    );

                    // Send immediate result to the submitting player
                    socket.emit('quiz:answer_result', { isCorrect });

                    // Fetch updated leaderboard
                    const updatedRoom = await QuizRoom.findOne({ room_code: roomCode.toUpperCase() });
                    io.to(`quiz_room_${roomCode.toUpperCase()}`).emit('quiz:update_leaderboard', updatedRoom.players);
                } catch (err) {
                    console.error('Socket submit_answer error:', err);
                }
            });

            socket.on('quiz:host_next_question', async ({ roomCode }) => {
                const QuizRoom = require('../src/models/QuizRoom');
                const room = await QuizRoom.findOne({ room_code: roomCode.toUpperCase() }).populate('quiz_id');
                if (room && room.status === 'IN_PROGRESS') {
                    const quiz = room.quiz_id;
                    if (room.current_question_index < quiz.questions.length - 1) {
                        room.current_question_index += 1;
                        await room.save();
                        io.to(`quiz_room_${roomCode.toUpperCase()}`).emit('quiz:next_question', {
                            questionIndex: room.current_question_index
                        });
                    } else {
                        room.status = 'FINISHED';
                        await room.save();
                        io.to(`quiz_room_${roomCode.toUpperCase()}`).emit('quiz:finished', room.players);
                    }
                }
            });

            socket.on('disconnect_from_room', async ({ roomCode, userId }) => {
                const QuizRoom = require('../src/models/QuizRoom');
                await QuizRoom.updateOne(
                    { room_code: roomCode.toUpperCase(), 'players.user_id': userId },
                    { $set: { 'players.$.is_connected': false } }
                );
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
            });
        });

        return io;
    },
    getIo: () => {
        if (!io) {
            throw new Error('Socket.io not initialized!');
        }
        return io;
    }
};
