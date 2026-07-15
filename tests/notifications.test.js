const request = require('supertest');
const app = require('../Server/app');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Notification = require('../src/models/Notification');
const jwt = require('jsonwebtoken');

describe('Notifications API Enpoints (including deletion)', () => {
    let appServer, userToken;
    let testUser;
    let notif1, notif2;

    beforeAll(async () => {
        appServer = app.listen(0);
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/exlms_test');
        await mongoose.connection.db.dropDatabase();

        // Create test user
        testUser = await User.create({
            full_name: 'Test Notif User',
            email: 'notif_test@test.com',
            password_hash: '123',
            role: 'STUDENT',
            status: 'ACTIVE'
        });

        const secret = process.env.JWT_ACCESS_SECRET || 'access_secret_dev';
        userToken = jwt.sign({ userId: testUser._id, role: testUser.role }, secret);

        // Create 2 notifications (one read, one unread)
        notif1 = await Notification.create({
            recipient_id: testUser._id,
            title: 'Unread notification',
            body: 'Hello, this is unread.',
            type: 'SYSTEM',
            is_read: false
        });

        notif2 = await Notification.create({
            recipient_id: testUser._id,
            title: 'Read notification',
            body: 'Hello, this is read.',
            type: 'SYSTEM',
            is_read: true,
            read_at: new Date()
        });
    });

    afterAll(async () => {
        await mongoose.connection.close();
        appServer.close();
    });

    it('should fetch all notifications for the authenticated user', async () => {
        const res = await request(appServer)
            .get('/api/notifications')
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.length).toBe(2);
    });

    it('should mark a single notification as read', async () => {
        const res = await request(appServer)
            .put(`/api/notifications/${notif1._id}/read`)
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.is_read).toBe(true);

        const updated = await Notification.findById(notif1._id);
        expect(updated.is_read).toBe(true);
        expect(updated.read_at).toBeDefined();
    });

    it('should delete a single notification', async () => {
        const res = await request(appServer)
            .delete(`/api/notifications/${notif1._id}`)
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/đã xóa/i);

        const found = await Notification.findById(notif1._id);
        expect(found).toBeNull();
    });

    it('should delete all read notifications', async () => {
        // Since we deleted notif1, and notif2 is already read:
        // Let's first verify notif2 exists and is read
        const beforeDelete = await Notification.findById(notif2._id);
        expect(beforeDelete).not.toBeNull();
        expect(beforeDelete.is_read).toBe(true);

        const res = await request(appServer)
            .delete('/api/notifications/read')
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/đã xóa tất cả thông báo đã đọc/i);
        expect(res.body.count).toBe(1);

        const foundNotif2 = await Notification.findById(notif2._id);
        expect(foundNotif2).toBeNull();
    });
});
