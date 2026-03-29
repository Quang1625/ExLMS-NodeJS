const socketIo = require('socket.io');

let io;

module.exports = {
    init: (server) => {
        io = socketIo(server, {
            cors: {
                origin: 'http://localhost:5173', // Vite default port
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

            socket.on('quiz:submit_answer', async ({ roomCode, userId, questionId, answerId, isCorrect, points }) => {
                const QuizRoom = require('../src/models/QuizRoom');
                const room = await QuizRoom.findOne({ room_code: roomCode.toUpperCase() });
                if (room && room.status === 'IN_PROGRESS') {
                    // Update player score
                    await QuizRoom.updateOne(
                        { room_code: roomCode.toUpperCase(), 'players.user_id': userId },
                        {
                            $inc: { 'players.$.score': isCorrect ? points : 0 },
                            $set: { 'players.$.last_answer_at': new Date() }
                        }
                    );

                    // Notify lobby/host about answer (optional, for real-time leaderboard)
                    const updatedRoom = await QuizRoom.findOne({ room_code: roomCode.toUpperCase() });
                    io.to(`quiz_room_${roomCode.toUpperCase()}`).emit('quiz:update_leaderboard', updatedRoom.players);
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
