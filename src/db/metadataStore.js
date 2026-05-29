/**
 * metadataStore.js
 * Lightweight JSON-based metadata persistence layer.
 * Tracks file ownership, permissions, and audit history.
 * Can be swapped for a real DB (MongoDB, PostgreSQL) without changing the service layer.
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'metadata.json');

/**
 * Load the full metadata store from disk.
 * @returns {Object} Map of fileId -> metadata record
 */
function loadStore() {
    if (!fs.existsSync(DB_PATH)) {
        return {};
    }
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
}

/**
 * Persist the metadata store to disk.
 * @param {Object} store
 */
function saveStore(store) {
    fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

/**
 * Save metadata for a newly uploaded file.
 * @param {string} fileId - UUID of the file
 * @param {string} ownerClientId - clientId of the uploader
 * @param {string} originalName - original filename
 * @param {string} storedName - filename as stored on disk
 * @param {string} mimeType - MIME type of the file
 * @param {number} size - file size in bytes
 */
function saveFileMetadata(fileId, ownerClientId, originalName, storedName, mimeType, size) {
    const store = loadStore();
    store[fileId] = {
        fileId,
        ownerClientId,
        originalName,
        storedName,
        mimeType,
        size,
        createdAt: new Date().toISOString(),
        permissions: [ownerClientId],
    };
    saveStore(store);
}

/**
 * Retrieve metadata for a specific file.
 * @param {string} fileId
 * @returns {Object|null} metadata record or null if not found
 */
function getFileMetadata(fileId) {
    const store = loadStore();
    return store[fileId] || null;
}

/**
 * Delete metadata for a specific file.
 * @param {string} fileId
 */
function deleteFileMetadata(fileId) {
    const store = loadStore();
    delete store[fileId];
    saveStore(store);
}

/**
 * List all files owned by a specific client.
 * @param {string} clientId
 * @returns {Array} list of metadata records
 */
function listFilesByClient(clientId) {
    const store = loadStore();
    return Object.values(store).filter(f => f.ownerClientId === clientId);
}

module.exports = {
    saveFileMetadata,
    getFileMetadata,
    deleteFileMetadata,
    listFilesByClient,
};
