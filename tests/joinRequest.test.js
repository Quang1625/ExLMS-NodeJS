const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { StudyGroup } = require('../src/models/StudyGroup');
const { Course, CourseEnrollment } = require('../src/models/Course');

describe('Study Group Join Requests & Auto-enrollment', () => {
    let appServer, adminToken, studentToken;
    let adminUser, studentUser;
    let publicGroup, privateGroup, testCourse;

    beforeAll(async () => {
        appServer = app.listen(0);
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/exlms_test');
        await mongoose.connection.db.dropDatabase();

        // Create Users
        adminUser = await User.create({ full_name: 'Admin', email: 'admin@test.com', password_hash: '123', role: 'ADMIN', status: 'ACTIVE' });
        studentUser = await User.create({ full_name: 'Student', email: 'student@test.com', password_hash: '123', role: 'STUDENT', status: 'ACTIVE' });

        // Get Tokens (bypassing actual login for test simplicity, assuming JWT generation or mocking if needed)
        const jwt = require('jsonwebtoken');
        const secret = process.env.JWT_ACCESS_SECRET || 'access_secret_dev';
        adminToken = jwt.sign({ userId: adminUser._id, role: adminUser.role }, secret);
        studentToken = jwt.sign({ userId: studentUser._id, role: studentUser.role }, secret);

        // Create Groups & Course
        publicGroup = await StudyGroup.create({
            name: 'Public Group', visibility: 'PUBLIC', status: 'ACTIVE', owner_id: adminUser._id,
            members: [{ user_id: adminUser._id, role: 'OWNER', status: 'ACTIVE' }]
        });
        privateGroup = await StudyGroup.create({
            name: 'Private Group', visibility: 'PRIVATE', status: 'ACTIVE', owner_id: adminUser._id,
            members: [{ user_id: adminUser._id, role: 'OWNER', status: 'ACTIVE' }]
        });
        
        testCourse = await Course.create({
            title: 'Test Course', group_id: privateGroup._id, status: 'PUBLISHED', created_by: adminUser._id,
            order_index: 1
        });
    });

    afterAll(async () => {
        await mongoose.connection.close();
        appServer.close();
    });

    it('should allow student to auto-join PUBLIC group', async () => {
        const res = await request(appServer)
            .post(`/api/study-groups/${publicGroup._id}/join-requests`)
            .set('Authorization', `Bearer ${studentToken}`);
            
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/thành công/);

        const group = await StudyGroup.findById(publicGroup._id);
        const isMember = group.members.some(m => m.user_id.toString() === studentUser._id.toString());
        expect(isMember).toBe(true);
    });

    it('should create PENDING request for PRIVATE group', async () => {
        const res = await request(appServer)
            .post(`/api/study-groups/${privateGroup._id}/join-requests`)
            .set('Authorization', `Bearer ${studentToken}`)
            .send({ message: 'Hello' });
            
        expect(res.status).toBe(201);
        expect(res.body.message).toMatch(/chờ duyệt/);

        const group = await StudyGroup.findById(privateGroup._id);
        const req = group.join_requests.find(r => r.user_id.toString() === studentUser._id.toString());
        expect(req).toBeDefined();
        expect(req.status).toBe('PENDING');
    });

    it('admin should be able to approve request and trigger auto-enroll', async () => {
        const group = await StudyGroup.findById(privateGroup._id);
        const reqItem = group.join_requests.find(r => r.user_id.toString() === studentUser._id.toString());
        
        const res = await request(appServer)
            .put(`/api/study-groups/${privateGroup._id}/join-requests/${reqItem._id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'APPROVED' });
            
        expect(res.status).toBe(200);

        // Check Membership
        const updatedGroup = await StudyGroup.findById(privateGroup._id);
        const isMember = updatedGroup.members.some(m => m.user_id.toString() === studentUser._id.toString());
        expect(isMember).toBe(true);
        expect(updatedGroup.join_requests.id(reqItem._id).status).toBe('APPROVED');

        // Check Auto Enroll
        const enrollment = await CourseEnrollment.findOne({ course_id: testCourse._id, user_id: studentUser._id });
        expect(enrollment).not.toBeNull();
    });

    it('student should access course after approval', async () => {
        const res = await request(appServer)
            .get(`/api/courses/${testCourse._id}`)
            .set('Authorization', `Bearer ${studentToken}`);
            
        expect(res.status).toBe(200);
        expect(res.body.data._id).toBe(testCourse._id.toString());
    });
});
