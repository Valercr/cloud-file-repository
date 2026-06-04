/**
 * app.js
 * Punto de entrada de la aplicación Express.
 *
 * Este servicio actúa como repositorio de archivos para clientes externos
 * (ej: una aplicación Spring Boot). Expone dos endpoints principales:
 *
 *   POST /files          → recibe un archivo y lo almacena
 *   GET  /files/:fileId  → retorna la URL de descarga de un archivo
 */

require('dotenv').config();

const express = require('express');
const fileRoutes = require('./routes/fileRoutes');

const app = express();

app.use(express.json());

// Montar rutas de archivos
app.use('/files', fileRoutes);

// Manejador global de errores — captura cualquier error no manejado en los handlers
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    console.error('[ERROR]', err.message);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
