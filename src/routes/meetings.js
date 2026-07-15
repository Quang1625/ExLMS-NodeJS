const router = require('express').Router();
const Meeting = require('../models/Meeting');
const { AccessToken } = require('livekit-server-sdk');
const crypto = require('crypto');
const { authenticate, authorize } = require('../middleware/auth');

// Helper to generate a random 6-character access code
const generateAccessCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();

// GET meetings (filter by group_id, status)
router.get('/', authenticate, async (req, res, next) => {
    try {
        const { group_id, status } = req.query;
        const filter = {};
        if (group_id) filter.group_id = group_id;
        if (status) filter.status = status;

        const meetings = await Meeting.find(filter)
            .populate('created_by', 'full_name email')
            .populate('attendances.user_id', 'full_name email');
        res.json(meetings);
    } catch (err) { next(err); }
});

// POST create meeting - ONLY ADMIN and INSTRUCTOR
router.post('/', authenticate, authorize('ADMIN', 'INSTRUCTOR'), async (req, res, next) => {
    try {
        const { group_id, title, description, meeting_type, platform, start_at, duration_minutes, room_code } = req.body;
        
        if (!room_code) {
            return res.status(400).json({ error: 'Mã phòng (room_code) là bắt buộc' });
        }

        const meeting = new Meeting({
            group_id,
            created_by: req.user._id,
            title,
            description,
            meeting_type,
            platform,
            start_at,
            duration_minutes,
            room_code
        });

        await meeting.save();

        // Notify students in the group
        try {
            const { StudyGroup } = require('../models/StudyGroup');
            const Notification = require('../models/Notification');
            const group = await StudyGroup.findById(group_id);
            if (group) {
                // Find all active students/members in the group
                const groupMembers = group.members.filter(m => m.status === 'ACTIVE' && (m.role === 'MEMBER' || m.role === 'STUDENT'));
                const studentIds = groupMembers.map(m => m.user_id);

                if (studentIds.length > 0) {
                    const notifications = studentIds.map(userId => ({
                        recipient_id: userId,
                        title: `Phòng họp mới: ${meeting.title}`,
                        body: `Giảng viên vừa tạo phòng họp trong nhóm ${group.name}. Mã phòng: ${meeting.room_code}`,
                        type: 'NEW_MEETING',
                        action_url: `/study-groups/${group._id}?tab=meetings`,
                        source: { entity_id: meeting._id, entity_type: 'MEETING' }
                    }));

                    // Bulk insert notifications
                    await Notification.insertMany(notifications);

                    // Emit real-time socket event
                    const io = require('../../Server/socket').getIo();
                    io.to(`group_${group._id}`).emit('NEW_MEETING', {
                        meeting_id: meeting._id,
                        title: meeting.title,
                        group_name: group.name,
                        room_code: meeting.room_code
                    });
                }
            }
        } catch (notifErr) {
            console.error('Error sending meeting notifications:', notifErr);
        }

        res.status(201).json(meeting);
    } catch (err) { next(err); }
});

// POST join meeting with code verification
router.post('/:id/join', authenticate, async (req, res, next) => {
    try {
        const { room_code, roomName, participantName } = req.body;

        const meeting = await Meeting.findById(req.params.id);
        if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

        // Admin/Instructor can join directly
        if (req.user.role === 'ADMIN' || req.user.role === 'INSTRUCTOR') {
            const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
                identity: participantName || req.user._id.toString(),
                name: participantName || req.user.full_name,
            });
            at.addGrant({ roomJoin: true, room: roomName || meeting._id.toString() });

            const token = await at.toJwt();
            return res.json({ token, serverUrl: process.env.LIVEKIT_URL });
        }

        if (!room_code) {
            return res.status(400).json({ error: 'Mã phòng (room_code) là bắt buộc' });
        }

        // Verify access code
        if (meeting.room_code !== room_code) {
            meeting.access_logs.push({
                user_id: req.user._id,
                action: 'JOIN_FAILED',
                timestamp: new Date(),
                ip_address: req.ip
            });
            await meeting.save();
            return res.status(401).json({ error: 'Mã phòng không chính xác' });
        }

        // Success
        meeting.access_logs.push({
            user_id: req.user._id,
            action: 'JOIN_SUCCESS',
            timestamp: new Date(),
            ip_address: req.ip
        });
        
        await meeting.save();

        // Generate LiveKit token
        const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
            identity: participantName || req.user._id.toString(),
            name: participantName || req.user.full_name,
        });
        at.addGrant({ roomJoin: true, room: roomName || meeting._id.toString() });

        const token = await at.toJwt();
        res.json({ 
            token, 
            serverUrl: process.env.LIVEKIT_URL 
        });
    } catch (err) { next(err); }
});

// GET backward compatibility for token generation if needed (e.g. for instructors)
router.post('/token', authenticate, authorize('ADMIN', 'INSTRUCTOR'), async (req, res, next) => {
    try {
        const { roomName, participantName } = req.body;
        const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
            identity: participantName,
            name: participantName,
        });
        at.addGrant({ roomJoin: true, room: roomName });
        const token = await at.toJwt();
        res.json({ token, serverUrl: process.env.LIVEKIT_URL });
    } catch (err) { next(err); }
});

// ... keeping other routes intact (attend, polls, vote) ...

// POST record attendance
router.post('/:id/attend', async (req, res, next) => {
    try {
        const { user_id } = req.body;
        const meeting = await Meeting.findById(req.params.id);
        if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

        meeting.attendances.push({ user_id, joined_at: new Date() });
        await meeting.save();
        res.json(meeting);
    } catch (err) { next(err); }
});

// POST create poll
router.post('/:id/polls', async (req, res, next) => {
    try {
        const { question, options } = req.body;
        const meeting = await Meeting.findById(req.params.id);
        if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

        meeting.polls.push({
            question,
            is_active: true,
            options: options.map(label => ({ label, vote_count: 0, voters: [] }))
        });
        await meeting.save();
        res.json(meeting);
    } catch (err) { next(err); }
});

// POST vote on poll
router.post('/:meetingId/polls/:pollId/vote', async (req, res, next) => {
    try {
        const { user_id, option_id } = req.body;
        const meeting = await Meeting.findById(req.params.meetingId);
        if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

        const poll = meeting.polls.id(req.params.pollId);
        if (!poll) return res.status(404).json({ error: 'Poll not found' });

        const option = poll.options.id(option_id);
        if (!option) return res.status(404).json({ error: 'Option not found' });

        const alreadyVoted = poll.options.some(opt => opt.voters && opt.voters.includes(user_id));
        if (alreadyVoted) return res.status(400).json({ error: 'User already voted' });

        option.vote_count += 1;
        if (!option.voters) option.voters = [];
        option.voters.push(user_id);

        await meeting.save();
        res.json(meeting);
    } catch (err) { next(err); }
});

module.exports = router;
