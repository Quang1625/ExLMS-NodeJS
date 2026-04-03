const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ── Assignment Storage ───────────────────────────────────────────────────────
const assignmentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../public/uploads/assignments');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + safeName);
    }
});

// ── Lesson Storage (Videos, Slides) ──────────────────────────────────────────
const lessonStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../public/uploads/lessons');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'lesson-' + uniqueSuffix + '-' + safeName);
    }
});

const assignmentFilter = (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.zip', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
        cb(null, true);
    } else {
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Loại tệp không hợp lệ. Chỉ chấp nhận PDF, DOC, PPT, ZIP, TXT.'));
    }
};

const lessonFilter = (req, file, cb) => {
    const allowed = ['.pdf', '.ppt', '.pptx', '.mp4', '.mov', '.avi', '.mkv', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
        cb(null, true);
    } else {
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Loại tệp không hợp lệ. Chấp nhận Video (MP4, MOV, ...) hoặc Slide (PPT, PDF).'));
    }
};

const uploadInstructor = multer({ 
    storage: assignmentStorage, 
    limits: { fileSize: 1000 * 1024 * 1024 }, // 1000MB
    fileFilter: assignmentFilter 
});

const uploadStudent = multer({ 
    storage: assignmentStorage, 
    limits: { fileSize: 1000 * 1024 * 1024 }, // 1000MB
    fileFilter: assignmentFilter 
});

const uploadLesson = multer({
    storage: lessonStorage,
    limits: { fileSize: 1000 * 1024 * 1024 }, // 1000MB for videos
    fileFilter: lessonFilter
});

module.exports = { 
    uploadInstructor, 
    uploadStudent, 
    uploadLesson,
    multerErrorHandling: (err, req, res, next) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, error: err.message });
        } else if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        next();
    }
};
