/**
 * fileRoutes.js
 * Define las rutas del recurso /files.
 *
 * Contrato expuesto (para consumidores externos como FastAPI u otros clientes):
 *
 *   POST /files/upload-url
 *     - Sin body
 *     - Respuesta 200: { "uploadUrl": "<url pre-firmada>" }
 *     - FastAPI llama esto y redirige al cliente con 302
 *
 *   POST /files/upload?token=...
 *     - Content-Type: multipart/form-data
 *     - Campo: file (binario)
 *     - El cliente sube directamente aquí usando la uploadUrl
 *     - Respuesta 201: { "fileId": "<uuid>" }
 *
 *   GET /files/download?token=...
 *     - Sirve el archivo binario (token de descarga, un solo uso)
 *
 *   GET /files/:fileId
 *     - Respuesta 200: { "downloadUrl": "<url>" }
 */

const express = require('express');
const router = express.Router();

const { upload, getUploadUrl, receiveUpload, getDownloadUrl, serveFile } = require('../controllers/fileController');

// Maneja errores de multer antes de que lleguen a Express
function handleMulterError(err, req, res, next) {
    if (err && err.message) {
        return res.status(400).json({ message: err.message });
    }
    next(err);
}

// POST /files/upload-url — genera una URL pre-firmada para que el cliente suba directo
router.post('/upload-url', getUploadUrl);

// POST /files/upload?token=... — recibe el archivo del cliente con token pre-firmado
// IMPORTANTE: va ANTES de /:fileId para que Express no confunda "upload" con un fileId
router.post(
    '/upload',
    (req, res, next) => upload.single('file')(req, res, next),
    handleMulterError,
    receiveUpload
);

// GET /files/download?token=... — sirve el binario con token de descarga (uso único)
// IMPORTANTE: va ANTES de /:fileId por la misma razón
router.get('/download', serveFile);

// GET /files/:fileId — retorna la URL de descarga del archivo
router.get('/:fileId', getDownloadUrl);

module.exports = router;
