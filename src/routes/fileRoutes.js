/**
 * fileRoutes.js
 * Defines all /files routes and applies authentication/authorization middleware.
 */

const express = require('express');
const router = express.Router();

const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
    upload,
    uploadFile,
    generateLink,
    downloadFile,
    deleteFile,
    listFiles,
    getFileMetadata,
} = require('../controllers/fileController');

// Handle multer errors (file type / size violations) before they reach Express
function handleMulterError(err, req, res, next) {
    if (err && err.message) {
        return res.status(400).json({ message: err.message });
    }
    next(err);
}

// --- Protected routes (require valid JWT) ---

// Upload a file — only clients with the 'uploader' role
router.post(
    '/upload',
    authenticate,
    authorize('uploader'),
    (req, res, next) => upload.single('file')(req, res, next),
    handleMulterError,
    uploadFile
);

// Generate a one-time download link — only uploaders
router.post('/link', authenticate, authorize('uploader'), generateLink);

// List all files owned by the authenticated client
router.get('/', authenticate, listFiles);

// Get metadata for a specific file (owner only)
router.get('/:fileId/metadata', authenticate, getFileMetadata);

// Delete a file (owner only)
router.delete('/:fileId', authenticate, deleteFile);

// --- Public route ---

// Download a file using a signed, one-time-use token
router.get('/download', downloadFile);

module.exports = router;
