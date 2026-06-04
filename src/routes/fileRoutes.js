/**
 * fileRoutes.js
 * Define las rutas del recurso /files.
 *
 * Contrato expuesto (para consumidores externos como Spring Boot):
 *
 *   POST /files
 *     - Content-Type: multipart/form-data
 *     - Campo: file (binario)
 *     - Respuesta 201: { "fileId": "<uuid>" }
 *
 *   GET /files/:fileId
 *     - Respuesta 200: { "downloadUrl": "<url>" }
 */

const express = require('express');
const router = express.Router();

const { upload, uploadFile, getDownloadUrl, serveFile } = require('../controllers/fileController');

// Maneja errores de multer (tipo/tamaño de archivo) antes de que lleguen a Express
function handleMulterError(err, req, res, next) {
    if (err && err.message) {
        return res.status(400).json({ message: err.message });
    }
    next(err);
}

// POST /files — sube un archivo y retorna su fileId
router.post(
    '/',
    (req, res, next) => upload.single('file')(req, res, next),
    handleMulterError,
    uploadFile
);

// GET /files/download?token=... — sirve el binario usando el token firmado (uso único)
// IMPORTANTE: esta ruta debe ir ANTES de /:fileId para que Express no confunda
// "download" con un fileId
router.get('/download', serveFile);

// GET /files/:fileId — retorna la URL de descarga del archivo
router.get('/:fileId', getDownloadUrl);

module.exports = router;
