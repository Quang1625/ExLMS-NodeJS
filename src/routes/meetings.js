const router = require('express').Router();
const Meeting = require('../models/Meeting');

// GET meetings (filter by group_id, status)
router.get('/', async (req, res, next) => {
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

// POST create meeting
router.post('/', async (req, res, next) => {
    try {
        const meeting = new Meeting(req.body);
        await meeting.save();
        res.status(201).json(meeting);
    } catch (err) { next(err); }
});

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
