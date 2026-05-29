/**
 * fileService.js
 * Business logic layer for file operations.
 * Controllers delegate to this service; storage and metadata concerns are isolated here.
 */

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const {
    saveFileMetadata,
    getFileMetadata,
    deleteFileMetadata,
    listFilesByClient,
} = require('../db/metadataStore');

const { isTokenUsed, markTokenAsUsed } = require('../utils/tokenBlacklist');
const { audit } = require('../utils/auditLogger');

const STORAGE_DIR = path.join(__dirname, '../storage');
const DOWNLOAD_SECRET = process.env.DOWNLOAD_SECRET;

/**
 * Register a successfully uploaded file in the metadata store.
 * @param {string} fileId - UUID assigned during multer processing
 * @param {string} ownerClientId - clientId from the authenticated token
 * @param {Object} file - multer file object
 * @returns {string} the fileId
 */
function registerUpload(fileId, ownerClientId, file) {
    saveFileMetadata(
        fileId,
        ownerClientId,
        file.originalname,
        file.filename,
        file.mimetype,
        file.size
    );

    audit('UPLOAD', { fileId, ownerClientId, originalName: file.originalname, size: file.size });

    return fileId;
}

/**
 * Generate a signed, one-time-use download link for a file.
 * @param {string} fileId
 * @param {string} clientId - who is requesting the link
 * @returns {string} full download URL
 * @throws {Error} if the file does not exist in metadata
 */
function generateDownloadLink(fileId, clientId) {
    const metadata = getFileMetadata(fileId);

    if (!metadata) {
        const err = new Error('File not found');
        err.status = 404;
        throw err;
    }

    // Each link carries a unique jti (JWT ID) so it can be invalidated after one use
    const jti = uuidv4();
    const token = jwt.sign({ fileId, jti }, DOWNLOAD_SECRET, { expiresIn: '5m' });
    const link = `http://localhost:${process.env.PORT || 3000}/files/download?token=${token}`;

    audit('LINK_GENERATED', { fileId, clientId, jti });

    return link;
}

/**
 * Resolve and return the absolute path of a file for download.
 * Validates the token, enforces one-time use, and checks the file exists on disk.
 * @param {string} token - signed JWT from the download link
 * @returns {{ filePath: string, metadata: Object }}
 * @throws {Error} with .status set on validation failures
 */
function resolveDownload(token) {
    let decoded;

    try {
        decoded = jwt.verify(token, DOWNLOAD_SECRET);
    } catch {
        const err = new Error('Invalid or expired link');
        err.status = 403;
        throw err;
    }

    const { fileId, jti } = decoded;

    // Enforce one-time use
    if (isTokenUsed(jti)) {
        const err = new Error('Link already used');
        err.status = 403;
        throw err;
    }

    markTokenAsUsed(jti);

    const metadata = getFileMetadata(fileId);

    if (!metadata) {
        const err = new Error('File not found');
        err.status = 404;
        throw err;
    }

    const filePath = path.join(STORAGE_DIR, metadata.storedName);

    if (!fs.existsSync(filePath)) {
        const err = new Error('File not found on disk');
        err.status = 404;
        throw err;
    }

    audit('DOWNLOAD', { fileId, jti });

    return { filePath, metadata };
}

/**
 * Delete a file from disk and remove its metadata.
 * Only the owner can delete their file.
 * @param {string} fileId
 * @param {string} clientId - requesting client
 * @throws {Error} with .status on authorization or not-found failures
 */
function removeFile(fileId, clientId) {
    const metadata = getFileMetadata(fileId);

    if (!metadata) {
        const err = new Error('File not found');
        err.status = 404;
        throw err;
    }

    if (metadata.ownerClientId !== clientId) {
        const err = new Error('Forbidden: you do not own this file');
        err.status = 403;
        throw err;
    }

    const filePath = path.join(STORAGE_DIR, metadata.storedName);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    deleteFileMetadata(fileId);
    audit('DELETE', { fileId, clientId });
}

/**
 * Return metadata for a specific file.
 * Only the owner can view metadata.
 * @param {string} fileId
 * @param {string} clientId
 * @returns {Object} metadata record
 * @throws {Error} with .status on failures
 */
function getMetadata(fileId, clientId) {
    const metadata = getFileMetadata(fileId);

    if (!metadata) {
        const err = new Error('File not found');
        err.status = 404;
        throw err;
    }

    if (metadata.ownerClientId !== clientId) {
        const err = new Error('Forbidden');
        err.status = 403;
        throw err;
    }

    return metadata;
}

/**
 * List all files belonging to the requesting client.
 * @param {string} clientId
 * @returns {Array} list of metadata records
 */
function listFiles(clientId) {
    return listFilesByClient(clientId);
}

module.exports = {
    registerUpload,
    generateDownloadLink,
    resolveDownload,
    removeFile,
    getMetadata,
    listFiles,
};
