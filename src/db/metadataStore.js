/**
 * metadataStore.js
 * Capa de persistencia de metadatos basada en JSON.
 *
 * Guarda información sobre cada archivo subido (sin propietario, ya que este
 * servicio no maneja autenticación de usuarios).
 *
 * Para producción, puede reemplazarse por MongoDB, PostgreSQL, etc.
 * sin necesidad de cambiar el servicio.
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'metadata.json');

/**
 * Carga el store completo desde disco.
 * @returns {Object} Mapa de fileId → registro de metadatos
 */
function loadStore() {
    if (!fs.existsSync(DB_PATH)) {
        return {};
    }
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
}

/**
 * Persiste el store en disco.
 * @param {Object} store
 */
function saveStore(store) {
    fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

/**
 * Guarda los metadatos de un archivo recién subido.
 *
 * @param {string} fileId       - UUID del archivo
 * @param {string} originalName - Nombre original del archivo
 * @param {string} storedName   - Nombre en disco: "<uuid>-<originalName>"
 * @param {string} mimeType     - MIME type del archivo
 * @param {number} size         - Tamaño en bytes
 */
function saveFileMetadata(fileId, originalName, storedName, mimeType, size) {
    const store = loadStore();
    store[fileId] = {
        fileId,
        originalName,
        storedName,
        mimeType,
        size,
        createdAt: new Date().toISOString(),
    };
    saveStore(store);
}

/**
 * Retorna los metadatos de un archivo específico.
 * @param {string} fileId
 * @returns {Object|null} Registro de metadatos, o null si no existe
 */
function getFileMetadata(fileId) {
    const store = loadStore();
    return store[fileId] || null;
}

module.exports = {
    saveFileMetadata,
    getFileMetadata,
};
