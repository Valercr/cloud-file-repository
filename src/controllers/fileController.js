/**
 * fileController.js
 * Thin HTTP layer — validates input, delegates to fileService, and formats responses.
 * Each handler stays well under 20 lines of logic.
 */

const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const fileService = require('../services/fileService');

// ---------------------------------------------------------------------------
// Multer configuration — storage, file type validation, and size limit
// ---------------------------------------------------------------------------

/** Allowed MIME types for uploaded files */
const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'text/plain',
]);

/** Maximum upload size: 10 MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const diskStorage = multer.diskStorage({
    destination: path.join(__dirname, '../storage'),
    filename: (req, file, cb) => {
        const fileId = uuidv4();
        // Attach the id to the file object so the controller can read it after upload
        file.fileId = fileId;
        cb(null, `${fileId}-${file.originalname}`);
    },
});

/**
 * Multer middleware with file type and size restrictions.
 * Rejects files that are not in the allowed MIME type list.
 */
const upload = multer({
    storage: diskStorage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type not allowed: ${file.mimetype}`));
        }
    },
});

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * POST /files/upload
 * Requires: authenticate + authorize('uploader')
 */
function uploadFile(req, res) {
    try {
        const fileId = fileService.registerUpload(
            req.file.fileId,
            req.client.clientId,
            req.file
        );
        res.status(201).json({ fileId });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
    }
}

/**
 * POST /files/link
 * Body: { fileId }
 * Requires: authenticate + authorize('uploader')
 */
function generateLink(req, res) {
    const { fileId } = req.body;

    if (!fileId) {
        return res.status(400).json({ message: 'fileId is required' });
    }

    try {
        const link = fileService.generateDownloadLink(fileId, req.client.clientId);
        res.json({ link });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
    }
}

/**
 * GET /files/download?token=...
 * Public endpoint — the token itself is the access control mechanism.
 * Each token is valid for one use only.
 */
function downloadFile(req, res) {
    const { token } = req.query;

    if (!token) {
        return res.status(400).send('token is required');
    }

    try {
        const { filePath } = fileService.resolveDownload(token);
        res.download(filePath);
    } catch (err) {
        res.status(err.status || 500).send(err.message || 'Internal server error');
    }
}

/**
 * DELETE /files/:fileId
 * Requires: authenticate
 * Only the file owner can delete their file.
 */
function deleteFile(req, res) {
    const { fileId } = req.params;

    try {
        fileService.removeFile(fileId, req.client.clientId);
        res.json({ message: 'File deleted successfully' });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
    }
}

/**
 * GET /files
 * Requires: authenticate
 * Returns all files owned by the requesting client.
 */
function listFiles(req, res) {
    try {
        const files = fileService.listFiles(req.client.clientId);
        res.json({ files });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
    }
}

/**
 * GET /files/:fileId/metadata
 * Requires: authenticate
 * Returns metadata for a specific file (owner only).
 */
function getFileMetadata(req, res) {
    const { fileId } = req.params;

    try {
        const metadata = fileService.getMetadata(fileId, req.client.clientId);
        res.json({ metadata });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
    }
}

module.exports = { upload, uploadFile, generateLink, downloadFile, deleteFile, listFiles, getFileMetadata };
