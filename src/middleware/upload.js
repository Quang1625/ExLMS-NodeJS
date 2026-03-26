const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../public/uploads/assignments');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // preserve original name for display, but make it safe
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + safeName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.zip', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
        cb(null, true);
    } else {
        cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Invalid file type. Only PDF, DOC, PPT, ZIP, TXT are allowed.'));
    }
};

const uploadInstructor = multer({ 
    storage, 
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter 
});

const uploadStudent = multer({ 
    storage, 
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
    fileFilter 
});

module.exports = { uploadInstructor, uploadStudent, multerErrorHandling: (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, error: err.message });
    } else if (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
    next();
}};
