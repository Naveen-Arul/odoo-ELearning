const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Check if running on Vercel (serverless)
const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;

// Use /tmp on Vercel (only writable directory), local paths otherwise
const baseUploadDir = isVercel ? os.tmpdir() : path.join(__dirname, '..', 'uploads');
const profileDir = path.join(baseUploadDir, 'profiles');
const resumeDir = path.join(baseUploadDir, 'resumes');

// Ensure upload directories exist (wrapped in try-catch for serverless)
try {
    [profileDir, resumeDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
} catch (err) {
    console.warn('Could not create upload directories (normal in serverless):', err.message);
}

// Use memory storage on Vercel, disk storage locally
const storage = isVercel
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: (req, file, cb) => {
            if (file.fieldname === 'resume') {
                cb(null, resumeDir);
            } else {
                cb(null, profileDir);
            }
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const prefix = file.fieldname === 'resume' ? 'resume' : 'profile';
            cb(null, `${prefix}-${uniqueSuffix}${path.extname(file.originalname)}`);
        }
    });

// File filter
const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'resume') {
        if (file.mimetype === 'application/pdf' ||
            file.mimetype === 'application/msword' ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and Word documents are allowed for resumes!'), false);
        }
    } else {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed for profiles!'), false);
        }
    }
};

// Limits
const limits = {
    fileSize: 10 * 1024 * 1024 // 10MB limit
};

const upload = multer({
    storage,
    fileFilter,
    limits
});

module.exports = upload;
