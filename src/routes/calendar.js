const router = require('express').Router();
const CalendarEvent = require('../models/CalendarEvent');
const { CourseEnrollment, Course } = require('../models/Course');
const { Assignment } = require('../models/Assignment');
const Meeting = require('../models/Meeting');
const { Quiz } = require('../models/Quiz');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET calendar events for a user (with optional date range)
router.get('/', async (req, res, next) => {
    try {
        const user_id = req.user._id;
        const { start_date, end_date } = req.query;

        const mongoose = require('mongoose');
        const objId = new mongoose.Types.ObjectId(user_id);

        const sDate = start_date ? new Date(start_date) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const eDate = end_date ? new Date(end_date) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

        const filter = { user_id: objId };
        filter.start_at = { $gte: sDate, $lte: eDate };

        // 1. Fetch persistent events
        const events = await CalendarEvent.find(filter).lean();

        // 2. Fetch enrolled & created courses to generate virtual sessions
        const enrollments = await CourseEnrollment.find({ user_id });
        const enrolledCourseIds = enrollments.map(e => e.course_id);

        const courses = await Course.find({
            $or: [
                { _id: { $in: enrolledCourseIds } },
                { created_by: objId }
            ],
            status: { $in: ['PUBLISHED', 'ENDED'] }
        }).lean();

        const virtualEvents = [];
        for (const course of courses) {
            if (!course.schedule_days || !course.start_time || !course.end_time) continue;

            const days = course.schedule_days.split(',').map(d => parseInt(d.trim()));
            const [sh, sm] = course.start_time.split(':').map(Number);
            const [eh, em] = course.end_time.split(':').map(Number);

            // Start iteration from max(course_start, query_start)
            let current = new Date(Math.max(new Date(course.start_date || 0), sDate));
            const rangeEnd = new Date(Math.min(new Date(course.end_date || '2099-01-01'), eDate));

            // Normalize to start of day
            current.setHours(0, 0, 0, 0);

            while (current <= rangeEnd) {
                if (days.includes(current.getDay())) {
                    const sessionStart = new Date(current);
                    sessionStart.setHours(sh, sm, 0, 0);
                    
                    const sessionEnd = new Date(current);
                    sessionEnd.setHours(eh, em, 0, 0);

                    virtualEvents.push({
                        _id: `course-session-${course._id}-${current.getTime()}`,
                        user_id: user_id,
                        title: `Buổi học: ${course.title}`,
                        description: `Lịch học định kỳ (${course.start_time} - ${course.end_time})`,
                        start_at: sessionStart,
                        end_at: sessionEnd,
                        event_type: 'COURSE_SESSION',
                        source: { entity_id: course._id, entity_type: 'COURSE' }
                    });
                }
                current.setDate(current.getDate() + 1);
            }
        }

        const { StudyGroup } = require('../models/StudyGroup');
        const groups = await StudyGroup.find({ 'members.user_id': objId, 'members.status': 'ACTIVE' });
        const groupIds = groups.map(g => g._id);

        // 3. Fetch assignments for these groups
        const assignments = await Assignment.find({
            group_id: { $in: groupIds },
            status: 'PUBLISHED',
            due_at: { $gte: sDate, $lte: eDate }
        }).lean();

        for (const a of assignments) {
            virtualEvents.push({
                _id: `assignment-${a._id}`,
                user_id: user_id,
                title: `Hạn nộp: ${a.title}`,
                description: `Bài tập từ nhóm ${groups.find(g => g._id.toString() === a.group_id.toString())?.name || ''}`,
                start_at: a.due_at,
                end_at: a.due_at,
                event_type: 'ASSIGNMENT_DUE',
                source: { entity_id: a._id, entity_type: 'ASSIGNMENT' }
            });
        }

        // 4. Fetch meetings for these groups
        const meetings = await Meeting.find({
            group_id: { $in: groupIds },
            status: { $in: ['SCHEDULED', 'LIVE'] },
            start_at: { $gte: sDate, $lte: eDate }
        }).lean();

        for (const m of meetings) {
            const endAt = new Date(m.start_at.getTime() + (m.duration_minutes || 60) * 60000);
            virtualEvents.push({
                _id: `meeting-${m._id}`,
                user_id: user_id,
                title: `Lịch họp: ${m.title}`,
                description: `Họp nhóm ${groups.find(g => g._id.toString() === m.group_id.toString())?.name || ''}`,
                start_at: m.start_at,
                end_at: endAt,
                event_type: 'MEETING',
                source: { entity_id: m._id, entity_type: 'MEETING' }
            });
        }

        const allEvents = [...events, ...virtualEvents].sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
        res.json(allEvents);
    } catch (err) { next(err); }
});

// POST create personal event
router.post('/', async (req, res, next) => {
    try {
        const event = new CalendarEvent({ ...req.body, user_id: req.user._id });
        await event.save();
        res.status(201).json(event);
    } catch (err) { next(err); }
});

// POST auto-generate events from courses, assignments, meetings
router.post('/generate', async (req, res, next) => {
    try {
        const user_id = req.user._id;
        const { group_id } = req.body;

        const enrollments = await CourseEnrollment.find({ user_id });
        const courseIds = enrollments.map(e => e.course_id);

        const [courses, assignments, meetings] = await Promise.all([
            Course.find({ _id: { $in: courseIds } }),
            Assignment.find({ group_id, status: 'PUBLISHED' }),
            Meeting.find({ group_id, status: { $in: ['SCHEDULED', 'LIVE'] } })
        ]);

        const eventsToCreate = [];

        for (const course of courses) {
            if (course.start_date) eventsToCreate.push({ user_id, title: `Course Start: ${course.title}`, start_at: course.start_date, event_type: 'COURSE_START', source: { entity_id: course._id, entity_type: 'COURSE' } });
            if (course.end_date)   eventsToCreate.push({ user_id, title: `Course End: ${course.title}`, start_at: course.end_date, event_type: 'COURSE_END', source: { entity_id: course._id, entity_type: 'COURSE' } });
        }
        for (const a of assignments) {
            eventsToCreate.push({ user_id, title: `Assignment Due: ${a.title}`, start_at: a.due_at, event_type: 'ASSIGNMENT_DUE', source: { entity_id: a._id, entity_type: 'ASSIGNMENT' } });
        }
        for (const m of meetings) {
            eventsToCreate.push({ user_id, title: `Meeting: ${m.title}`, start_at: m.start_at, end_at: new Date(m.start_at.getTime() + m.duration_minutes * 60000), event_type: 'MEETING', source: { entity_id: m._id, entity_type: 'MEETING' } });
        }

        let created = 0;
        for (const ev of eventsToCreate) {
            const exists = await CalendarEvent.findOne({ user_id: ev.user_id, 'source.entity_id': ev.source.entity_id, 'source.entity_type': ev.source.entity_type });
            if (!exists) { await CalendarEvent.create(ev); created++; }
        }

        res.json({ message: `Generated ${created} new events` });
    } catch (err) { next(err); }
});

module.exports = router;
