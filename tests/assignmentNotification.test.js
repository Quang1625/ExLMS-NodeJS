const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { StudyGroup } = require('../src/models/StudyGroup');
const { Assignment } = require('../src/models/Assignment');
const Notification = require('../src/models/Notification');
const jwt = require('jsonwebtoken');

jest.mock('../src/socket', () => ({
    getIo: () => ({
        to: () => ({ emit: jest.fn() })
    }),
    init: jest.fn()
}));

describe('Assignment Real-time Notification Flow', () => {
    let appServer, adminToken;
    let instructor, student1, student2;
    let testGroup;

    beforeAll(async () => {
        appServer = app.listen(0);
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/exlms_test');
        await mongoose.connection.db.dropDatabase();

        // Users
        instructor = await User.create({ full_name: 'Inst', email: 'inst@test.com', password_hash: '123', role: 'INSTRUCTOR', status: 'ACTIVE' });
        student1 = await User.create({ full_name: 'S1', email: 's1@test.com', password_hash: '123', role: 'STUDENT', status: 'ACTIVE' });
        student2 = await User.create({ full_name: 'S2', email: 's2@test.com', password_hash: '123', role: 'STUDENT', status: 'ACTIVE' });

        const secret = process.env.JWT_ACCESS_SECRET || 'access_secret_dev';
        adminToken = jwt.sign({ userId: instructor._id, role: instructor.role }, secret);

        // Group with instructor as owner and 2 students as members
        testGroup = await StudyGroup.create({
            name: 'Test Group for Notifs', visibility: 'PUBLIC', status: 'ACTIVE', owner_id: instructor._id,
            members: [
                { user_id: instructor._id, role: 'OWNER', status: 'ACTIVE' },
                { user_id: student1._id, role: 'MEMBER', status: 'ACTIVE' },
                { user_id: student2._id, role: 'MEMBER', status: 'ACTIVE' }
            ]
        });
    });

    afterAll(async () => {
        await mongoose.connection.close();
        appServer.close();
    });

    it('should create notifications for all members when assignment is created', async () => {
        const payload = {
            group_id: testGroup._id.toString(),
            title: 'Test Assignment Notifications',
            due_at: new Date(Date.now() + 86400000).toISOString(),
            submission_type: 'FILE',
            max_score: 100,
            status: 'PUBLISHED'
        };

        const res = await request(appServer)
            .post('/api/assignments')
            .set('Authorization', `Bearer ${adminToken}`)
            .field('group_id', payload.group_id)
            .field('title', payload.title)
            .field('due_at', payload.due_at)
            .field('submission_type', payload.submission_type)
            .field('max_score', payload.max_score)
            .field('status', payload.status);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);

        const assignmentId = res.body.data._id;

        // Check if DB has exactly 2 notifications (for student1 and student2)
        const notifications = await Notification.find({ type: 'NEW_ASSIGNMENT' });
        expect(notifications.length).toBe(2);

        const s1Notif = notifications.find(n => n.recipient_id.toString() === student1._id.toString());
        expect(s1Notif).toBeDefined();
        expect(s1Notif.title).toContain('Test Assignment');
        expect(s1Notif.action_url).toBe(`/assignments/${assignmentId}`);
        expect(s1Notif.is_read).toBe(false);

        const s2Notif = notifications.find(n => n.recipient_id.toString() === student2._id.toString());
        expect(s2Notif).toBeDefined();
    });
});
