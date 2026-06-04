/**
 * fileController.js
 * Capa HTTP — valida la entrada, delega al servicio y formatea las respuestas.
 *
 * Endpoints:
 *   POST /files          → uploadFile
 *   GET  /files/:fileId  → getDownloadUrl
 */

const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const fileService = require('../services/fileService');

// ---------------------------------------------------------------------------
// Configuración de Multer — almacenamiento en disco, validación y límite de tamaño
// ---------------------------------------------------------------------------

/** MIME types permitidos para subida */
const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'text/plain',
]);

/** Tamaño máximo: 10 MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const diskStorage = multer.diskStorage({
    destination: path.join(__dirname, '../storage'),
    filename: (req, file, cb) => {
        // El nombre en disco incluye el UUID para evitar colisiones
        const fileId = uuidv4();
        file.fileId = fileId; // lo adjuntamos al objeto para leerlo después
        cb(null, `${fileId}-${file.originalname}`);
    },
});

/**
 * Middleware de Multer con validación de tipo y tamaño.
 * Rechaza archivos cuyo MIME type no esté en la lista permitida.
 */
const upload = multer({
    storage: diskStorage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
        }
    },
});

// ---------------------------------------------------------------------------
// Handlers de rutas
// ---------------------------------------------------------------------------

/**
 * POST /files
 * Recibe un archivo via multipart/form-data (campo: "file").
 * Responde 201 con { fileId } si todo va bien.
 */
function uploadFile(req, res) {
    if (!req.file) {
        return res.status(400).json({ message: 'El campo "file" es requerido' });
    }

    try {
        const fileId = fileService.registerUpload(req.file.fileId, req.file);
        res.status(201).json({ fileId });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
    }
}

/**
 * GET /files/:fileId
 * Retorna la URL de descarga del archivo.
 * Responde 200 con { downloadUrl }.
 */
function getDownloadUrl(req, res) {
    const { fileId } = req.params;

    try {
        const downloadUrl = fileService.generateDownloadUrl(fileId);
        res.json({ downloadUrl });
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
    }
}

/**
 * GET /files/download?token=...
 * Endpoint público que sirve el archivo binario.
 * El token es firmado, de un solo uso y expira en 5 minutos.
 */
function serveFile(req, res) {
    const { token } = req.query;

    if (!token) {
        return res.status(400).json({ message: 'El parámetro "token" es requerido' });
    }

    try {
        const { filePath } = fileService.resolveDownload(token);
        res.download(filePath);
    } catch (err) {
        res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
    }
}

module.exports = { upload, uploadFile, getDownloadUrl, serveFile };
