const mongoose = require('mongoose');

const quizRoomSchema = new mongoose.Schema({
    room_code: { type: String, required: true, unique: true },
    quiz_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    host_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { 
        type: String, 
        enum: ['LOBBY', 'STARTING', 'IN_PROGRESS', 'FINISHED'], 
        default: 'LOBBY' 
    },
    current_question_index: { type: Number, default: -1 },
    players: [{
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        score: { type: Number, default: 0 },
        is_connected: { type: Boolean, default: true },
        last_answer_at: Date
    }],
    settings: {
        time_per_question: { type: Number, default: 30 },
        auto_advance: { type: Boolean, default: false }
    }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('QuizRoom', quizRoomSchema);
