/**
 * fileService.js
 * Lógica de negocio para operaciones de archivos.
 *
 * Responsabilidades:
 *   1. Registrar un archivo subido en el store de metadatos.
 *   2. Generar una URL de descarga firmada (JWT de un solo uso, válida 5 minutos).
 *   3. Resolver la descarga real a partir del token firmado.
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
    registerUpload,
    generateDownloadUrl,
    resolveDownload,
};
