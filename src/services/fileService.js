/**
 * fileService.js
 * Lógica de negocio para operaciones de archivos.
 *
 * Responsabilidades:
 *   1. Generar una URL pre-firmada de SUBIDA (el cliente sube directo, sin pasar por FastAPI).
 *   2. Recibir y registrar el archivo cuando el cliente lo sube usando la URL pre-firmada.
 *   3. Generar una URL de descarga firmada (JWT de un solo uso, válida 5 minutos).
 *   4. Resolver la descarga real a partir del token firmado.
 */

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const { saveFileMetadata, getFileMetadata } = require('../db/metadataStore');
const { isTokenUsed, markTokenAsUsed } = require('../utils/tokenBlacklist');
const { audit } = require('../utils/auditLogger');

const STORAGE_DIR = path.join(__dirname, '../storage');
const DOWNLOAD_SECRET = process.env.DOWNLOAD_SECRET;
const UPLOAD_SECRET = process.env.UPLOAD_SECRET || process.env.DOWNLOAD_SECRET;

/**
 * Genera una URL pre-firmada de SUBIDA.
 * El cliente usará esta URL para subir el archivo directamente al servicio,
 * sin que el archivo pase por FastAPI.
 *
 * El token lleva un jti único para uso único y expira en 10 minutos.
 *
 * @returns {string} URL completa de subida pre-firmada
 */
function generateUploadUrl() {
    const jti = uuidv4();
    const token = jwt.sign({ action: 'upload', jti }, UPLOAD_SECRET, { expiresIn: '10m' });
    const uploadUrl = `http://localhost:${process.env.PORT || 3000}/files/upload?token=${token}`;

    audit('UPLOAD_URL_GENERATED', { jti });

    return uploadUrl;
}

/**
 * Valida el token de subida y retorna el jti para uso único.
 * @param {string} token
 * @returns {{ jti: string }}
 * @throws {Error} 403 si el token es inválido, expirado o ya fue usado
 */
function validateUploadToken(token) {
    let decoded;

    try {
        decoded = jwt.verify(token, UPLOAD_SECRET);
    } catch {
        const err = new Error('Token de subida inválido o expirado');
        err.status = 403;
        throw err;
    }

    if (decoded.action !== 'upload') {
        const err = new Error('Token de subida inválido');
        err.status = 403;
        throw err;
    }

    const { jti } = decoded;

    if (isTokenUsed(jti)) {
        const err = new Error('Este enlace de subida ya fue utilizado');
        err.status = 403;
        throw err;
    }

    markTokenAsUsed(jti);
    return { jti };
}

/**
 * Registra un archivo recién subido en el store de metadatos.
 *
 * @param {string} fileId - UUID asignado durante el procesamiento de Multer
 * @param {Object} file   - Objeto file de Multer
 * @returns {string} El fileId registrado
 */
function registerUpload(fileId, file) {
    saveFileMetadata(
        fileId,
        file.originalname,
        file.filename,   // nombre en disco: "<uuid>-<originalname>"
        file.mimetype,
        file.size
    );

    audit('UPLOAD', { fileId, originalName: file.originalname, size: file.size });

    return fileId;
}

/**
 * Genera una URL de descarga firmada para el archivo indicado.
 * El token es de un solo uso y expira en 5 minutos.
 *
 * @param {string} fileId
 * @returns {string} URL completa de descarga
 * @throws {Error} 404 si el archivo no existe en metadatos
 */
function generateDownloadUrl(fileId) {
    const metadata = getFileMetadata(fileId);

    if (!metadata) {
        const err = new Error('Archivo no encontrado');
        err.status = 404;
        throw err;
    }

    // jti único para poder invalidar el token tras su primer uso
    const jti = uuidv4();
    const token = jwt.sign({ fileId, jti }, DOWNLOAD_SECRET, { expiresIn: '5m' });
    const downloadUrl = `http://localhost:${process.env.PORT || 3000}/files/download?token=${token}`;

    audit('URL_GENERATED', { fileId, jti });

    return downloadUrl;
}

/**
 * Resuelve y retorna la ruta absoluta de un archivo para su descarga.
 * Valida el token, aplica uso único y verifica que el archivo exista en disco.
 *
 * @param {string} token - JWT firmado proveniente de la URL de descarga
 * @returns {{ filePath: string, metadata: Object }}
 * @throws {Error} con .status en caso de fallo de validación
 */
function resolveDownload(token) {
    let decoded;

    try {
        decoded = jwt.verify(token, DOWNLOAD_SECRET);
    } catch {
        const err = new Error('Enlace inválido o expirado');
        err.status = 403;
        throw err;
    }

    const { fileId, jti } = decoded;

    // Verificar uso único
    if (isTokenUsed(jti)) {
        const err = new Error('Este enlace ya fue utilizado');
        err.status = 403;
        throw err;
    }

    markTokenAsUsed(jti);

    const metadata = getFileMetadata(fileId);

    if (!metadata) {
        const err = new Error('Archivo no encontrado');
        err.status = 404;
        throw err;
    }

    const filePath = path.join(STORAGE_DIR, metadata.storedName);

    if (!fs.existsSync(filePath)) {
        const err = new Error('Archivo no encontrado en disco');
        err.status = 404;
        throw err;
    }

    audit('DOWNLOAD', { fileId, jti });

    return { filePath, metadata };
}

module.exports = {
    generateUploadUrl,
    validateUploadToken,
    registerUpload,
    generateDownloadUrl,
    resolveDownload,
};
