const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../Server/app');
const User = require('../src/models/User');
const Meeting = require('../src/models/Meeting');
const jwt = require('jsonwebtoken');

describe('Meetings API (Room Code)', () => {
    let adminToken, studentToken;
    let adminUser, studentUser;
    
    beforeAll(async () => {
        require('dotenv').config();
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/ExLMS_test');
        
        // Create test users
        adminUser = await User.create({
            email: 'admin_meet@test.com',
            full_name: 'Admin Meet',
            role: 'ADMIN',
            status: 'ACTIVE'
        });
        
        studentUser = await User.create({
            email: 'student_meet@test.com',
            student_code: 'SV12345',
            full_name: 'Student Meet',
            role: 'STUDENT',
            status: 'ACTIVE'
        });

        adminToken = jwt.sign({ userId: adminUser._id }, process.env.JWT_ACCESS_SECRET || 'access_secret_dev');
        studentToken = jwt.sign({ userId: studentUser._id }, process.env.JWT_ACCESS_SECRET || 'access_secret_dev');
    });

    afterAll(async () => {
        await User.deleteMany({ email: { $in: ['admin_meet@test.com', 'student_meet@test.com'] } });
        await Meeting.deleteMany({ created_by: adminUser._id });
        await mongoose.connection.close();
    });

    let createdMeetingId;

    it('should allow ADMIN to create a meeting with a room_code', async () => {
        const res = await request(app)
            .post('/api/meetings')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                group_id: new mongoose.Types.ObjectId(),
                title: 'Test Meeting',
                meeting_type: 'VIDEO_CONFERENCE',
                start_at: new Date(),
                duration_minutes: 60,
                room_code: 'SECRET123'
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body.room_code).toEqual('SECRET123');
        
        createdMeetingId = res.body._id;
    });

    it('should fail to join with wrong room code', async () => {
        const res = await request(app)
            .post(`/api/meetings/${createdMeetingId}/join`)
            .set('Authorization', `Bearer ${studentToken}`)
            .send({
                room_code: 'WRONG_CODE'
            });

        expect(res.statusCode).toEqual(401);
        expect(res.body.error).toMatch(/không chính xác/i);
    });

    it('should allow joining with correct room code', async () => {
        const res = await request(app)
            .post(`/api/meetings/${createdMeetingId}/join`)
            .set('Authorization', `Bearer ${studentToken}`)
            .send({
                room_code: 'SECRET123',
                roomName: 'TestRoom',
                participantName: 'Test Student'
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body.token).toBeDefined(); // LiveKit token

        // Verify logs in DB
        const updatedMeeting = await Meeting.findById(createdMeetingId);
        expect(updatedMeeting.access_logs).toHaveLength(2); // 1 fail, 1 success
        const successLog = updatedMeeting.access_logs.find(log => log.action === 'JOIN_SUCCESS');
        expect(successLog).toBeDefined();
        expect(successLog.user_id.toString()).toEqual(studentUser._id.toString());
    });
});
