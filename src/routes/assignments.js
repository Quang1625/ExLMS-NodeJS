const router = require('express').Router();
const { Assignment, AssignmentSubmission } = require('../models/Assignment');
const { StudyGroup } = require('../models/StudyGroup');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadInstructor, uploadStudent, multerErrorHandling } = require('../middleware/upload');
const exceljs = require('exceljs');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

// ── All routes require authentication ─────────────────────────────────────────
router.use(authenticate);

const CAN_MANAGE = authorize('ADMIN', 'INSTRUCTOR');

// Formats attachments array from req.files
const formatFiles = (files) => {
    if (!files || files.length === 0) return [];
    return files.map(f => ({
        file_name: f.originalname,
        file_url: '/uploads/assignments/' + f.filename,
        file_size: f.size,
        mimetype: f.mimetype
    }));
};

// GET /assignments – list (filter by group_id, course_id, status)
router.get('/', async (req, res, next) => {
    try {
        const { group_id, course_id, status } = req.query;
        const filter = {};
        if (group_id)  filter.group_id  = group_id;
        if (course_id) filter.course_id = course_id;
        if (status)    filter.status    = status;

        const assignments = await Assignment.find(filter)
            .populate('created_by', 'full_name email')
            .populate('group_id', 'name')
            .sort({ due_at: 1 });
        res.json({ success: true, data: assignments });
    } catch (err) { next(err); }
});

// (Moved GET /:id to the bottom to prevent route masking)

// POST /assignments – create (ADMIN or INSTRUCTOR only)
router.post('/', CAN_MANAGE, uploadInstructor.array('files', 10), multerErrorHandling, async (req, res, next) => {
    try {
        const assignment = new Assignment({
            ...req.body,
            created_by: req.user._id,
            attachments: formatFiles(req.files)
        });
        await assignment.save();

        // Notify students in the group
        try {
            const group = await StudyGroup.findById(assignment.group_id);
            if (group) {
                // Find all active students/members in the group
                const groupMembers = group.members.filter(m => m.status === 'ACTIVE' && (m.role === 'MEMBER' || m.role === 'STUDENT'));
                const studentIds = groupMembers.map(m => m.user_id);

                if (studentIds.length > 0) {
                    const notifications = studentIds.map(userId => ({
                        recipient_id: userId,
                        title: `Bài tập mới: ${assignment.title}`,
                        body: `Giảng viên vừa tạo bài tập mới trong nhóm ${group.name}. Hạn nộp: ${new Date(assignment.due_at).toLocaleString('vi-VN')}`,
                        type: 'NEW_ASSIGNMENT',
                        action_url: `/assignments/${assignment._id}`,
                        source: { entity_id: assignment._id, entity_type: 'ASSIGNMENT' }
                    }));

                    // Bulk insert notifications
                    await Notification.insertMany(notifications);

                    // Emit real-time socket event
                    const io = require('../socket').getIo();
                    io.to(`group_${group._id}`).emit('NEW_ASSIGNMENT', {
                        assignment_id: assignment._id,
                        title: assignment.title,
                        group_name: group.name,
                        due_at: assignment.due_at,
                        submission_type: assignment.submission_type
                    });
                }
            }
        } catch (notifErr) {
            console.error('Error sending assignment notifications:', notifErr);
            // We do not fail the assignment creation if notification fails
        }

        res.status(201).json({ success: true, data: assignment, message: 'Bài tập đã được tạo thành công' });
    } catch (err) { next(err); }
});

// PUT /assignments/:id – update (ADMIN or INSTRUCTOR only)
router.put('/:id', CAN_MANAGE, uploadInstructor.array('files', 10), multerErrorHandling, async (req, res, next) => {
    try {
        const { created_by, ...updateData } = req.body; 
        
        if (req.files && req.files.length > 0) {
            updateData.attachments = formatFiles(req.files);
        }

        const assignment = await Assignment.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('created_by', 'full_name email').populate('group_id', 'name');
        
        if (!assignment) return res.status(404).json({ success: false, error: 'Assignment not found' });
        res.json({ success: true, data: assignment, message: 'Bài tập đã được cập nhật' });
    } catch (err) { next(err); }
});

// DELETE /assignments/:id – remove (ADMIN or INSTRUCTOR only)
router.delete('/:id', CAN_MANAGE, async (req, res, next) => {
    try {
        const assignment = await Assignment.findByIdAndDelete(req.params.id);
        if (!assignment) return res.status(404).json({ success: false, error: 'Assignment not found' });
        
        // Remove submissions
        await AssignmentSubmission.deleteMany({ assignment_id: req.params.id });
        res.json({ success: true, message: 'Bài tập đã được xóa' });
    } catch (err) { next(err); }
});

// ── Dashboard & Exports (Instructor) ─────────────────────────────────────────

// GET /assignments/:id/dashboard - Get all students and their submission status
router.get('/:id/dashboard', CAN_MANAGE, async (req, res, next) => {
    try {
        const assignment = await Assignment.findById(req.params.id).populate('group_id');
        if (!assignment) return res.status(404).json({ success: false, error: 'Assignment not found' });

        const group = assignment.group_id;
        if (!group) return res.json({ success: true, data: [] });

        // Get all active students in group
        const groupMembers = group.members.filter(m => m.status === 'ACTIVE' && (m.role === 'MEMBER' || m.role === 'STUDENT'));
        const studentIds = groupMembers.map(m => m.user_id);

        const students = await User.find({ _id: { $in: studentIds } }).select('full_name email');
        
        // Get all submissions for these students for this assignment
        const submissions = await AssignmentSubmission.find({
            assignment_id: assignment._id,
            student_id: { $in: studentIds }
        }).sort({ submitted_at: -1 });

        // Merge student info with their latest submission
        const dashboardData = students.map(student => {
            const sub = submissions.find(s => s.student_id.toString() === student._id.toString());
            let status = 'PENDING';
            if (sub) status = sub.status || 'SUBMITTED';
            else if (new Date() > assignment.due_at) status = 'LATE_NO_SUBMISSION';

            return {
                student: { _id: student._id, full_name: student.full_name, email: student.email },
                submission: sub,
                status
            };
        });

        res.json({ success: true, data: dashboardData });
    } catch (err) { next(err); }
});

// GET /assignments/:id/export - Export excel
router.get('/:id/export', CAN_MANAGE, async (req, res, next) => {
    try {
        const assignment = await Assignment.findById(req.params.id).populate('group_id');
        if (!assignment) return res.status(404).send('Assignment not found');

        const groupMembers = assignment.group_id.members.filter(m => m.status === 'ACTIVE').map(m => m.user_id);
        const students = await User.find({ _id: { $in: groupMembers } });
        const submissions = await AssignmentSubmission.find({ assignment_id: assignment._id });

        const workbook = new exceljs.Workbook();
        const sheet = workbook.addWorksheet('Bao Cao Nop Bai');

        sheet.columns = [
            { header: 'Họ tên', key: 'name', width: 25 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Trạng thái', key: 'status', width: 20 },
            { header: 'Thời gian nộp', key: 'submitted_at', width: 25 },
            { header: 'Điểm', key: 'score', width: 10 }
        ];

        students.forEach(student => {
            const sub = submissions.find(s => s.student_id.toString() === student._id.toString());
            let status = 'Chưa nộp';
            let submitted_at = '';
            let score = '';

            if (sub) {
                status = sub.is_late ? 'Nộp trễ' : 'Đã nộp';
                submitted_at = new Date(sub.submitted_at).toLocaleString('vi-VN');
                if (sub.grade && sub.grade.status === 'GRADED') score = sub.grade.score;
            } else if (new Date() > assignment.due_at) {
                status = 'Lố hạn chưa nộp';
            }

            sheet.addRow({ name: student.full_name, email: student.email, status, submitted_at, score });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Assignment_${assignment._id}_Report.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) { next(err); }
});

// GET /assignments/:id/download-all - Zip all submissions
router.get('/:id/download-all', CAN_MANAGE, async (req, res, next) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) return res.status(404).send('Assignment not found');

        const submissions = await AssignmentSubmission.find({ assignment_id: assignment._id }).populate('student_id', 'full_name');
        
        const archive = archiver('zip', { zlib: { level: 9 } });
        res.attachment(`Assignment_${assignment._id}_Submissions.zip`);
        archive.pipe(res);

        submissions.forEach(sub => {
            if (sub.files && sub.files.length > 0) {
                sub.files.forEach((f, idx) => {
                    const filePath = path.join(__dirname, '../../public', f.file_url);
                    if (fs.existsSync(filePath)) {
                        const safeStudentName = sub.student_id.full_name.replace(/[^a-zA-Z0-9]/g, '_');
                        const ext = path.extname(f.file_name);
                        const fileNameInZip = `${safeStudentName}_${sub.student_id._id}_file${idx+1}${ext}`;
                        archive.file(filePath, { name: fileNameInZip });
                    }
                });
            }
        });

        archive.finalize();
    } catch (err) { next(err); }
});

// ── Submissions ────────────────────────────────────────────────────────────────

// POST /assignments/:id/submissions – submit (any authenticated user)
router.post('/:id/submissions', uploadStudent.array('files', 5), multerErrorHandling, async (req, res, next) => {
    try {
        const { submission_type, text_content, external_url } = req.body;

        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) return res.status(404).json({ success: false, error: 'Assignment not found' });
        if (assignment.status !== 'PUBLISHED')
            return res.status(400).json({ success: false, error: 'Assignment is not open for submissions' });

        const isLate = new Date() > assignment.due_at;
        if (isLate && !assignment.allow_late) {
            return res.status(403).json({ success: false, error: 'Bài tập đã quá hạn và không cho phép nộp trễ' });
        }

        // Check if existing submission
        let submission = await AssignmentSubmission.findOne({ assignment_id: req.params.id, student_id: req.user._id });

        const filesData = formatFiles(req.files);

        if (submission) {
            // Update existing submission
            submission.submission_type = submission_type || submission.submission_type;
            submission.text_content = text_content;
            submission.external_url = external_url;
            if (filesData.length > 0) submission.files = filesData;
            
            submission.is_late = isLate;
            submission.attempt_number += 1;
            submission.submitted_at = new Date();
            submission.status = isLate ? 'LATE' : 'SUBMITTED';
            // keep old grade if any, or reset it? Depending on policy, usually reset to PENDING
            if (submission.grade) submission.grade.status = 'PENDING';
            
            await submission.save();
        } else {
            // Create new
            submission = new AssignmentSubmission({
                assignment_id: req.params.id,
                student_id: req.user._id,
                submission_type: submission_type || 'FILE', 
                text_content, 
                external_url,
                files: filesData,
                is_late: isLate,
                status: isLate ? 'LATE' : 'SUBMITTED',
                attempt_number: 1
            });
            await submission.save();
        }

        res.status(201).json({ success: true, data: submission, message: 'Nộp bài thành công' });
    } catch (err) { next(err); }
});

// PUT /submissions/:id/grade – grade submission (ADMIN or INSTRUCTOR only)
router.put('/submissions/:id/grade', CAN_MANAGE, async (req, res, next) => {
    try {
        const { score, feedback, status } = req.body;

        const submission = await AssignmentSubmission.findById(req.params.id);
        if (!submission) return res.status(404).json({ success: false, error: 'Submission not found' });

        submission.grade = {
            grader_id:    req.user._id,
            score, feedback,
            status:       status || 'GRADED',
            graded_at:    new Date()
        };
        submission.status = 'GRADED';
        submission.markModified('grade');
        await submission.save();

        // Notify student
        const assignment = await Assignment.findById(submission.assignment_id);
        if (assignment) {
            await Notification.create({
                recipient_id: submission.student_id,
                title: `Bài tập đã được chấm: ${assignment.title}`,
                body:  `Bài nộp của bạn đã được chấm điểm. Điểm: ${score}`,
                type:  'ASSIGNMENT_GRADED',
                source: { entity_id: assignment._id, entity_type: 'ASSIGNMENT' }
            });
        }
        res.json({ success: true, data: submission, message: 'Chấm điểm thành công' });
    } catch (err) { next(err); }
});

// GET /assignments/:id – detail (Moved to bottom)
router.get('/:id', async (req, res, next) => {
    try {
        const assignment = await Assignment.findById(req.params.id)
            .populate('created_by', 'full_name email')
            .populate('group_id', 'name');
        if (!assignment) return res.status(404).json({ success: false, error: 'Assignment not found' });
        
        // Include the student's own submission if they are a STUDENT
        let submission = null;
        if (req.user.role === 'STUDENT') {
            submission = await AssignmentSubmission.findOne({ 
                assignment_id: assignment._id, 
                student_id: req.user._id 
            }).sort({ submitted_at: -1 });
        }
        
        res.json({ success: true, data: { ...assignment.toObject(), my_submission: submission } });
    } catch (err) { next(err); }
});

module.exports = router;
