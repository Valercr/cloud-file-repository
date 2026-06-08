/**
 * Plan de Pruebas — cloud-file-repository
 * Pruebas automáticas con Jest + Supertest
 *
 * Cubre los 3 endpoints:
 *   POST /files            — subir archivo
 *   GET  /files/:fileId    — obtener URL de descarga
 *   GET  /files/download   — descargar archivo con token
 */

const request = require('supertest');
const path    = require('path');
const fs      = require('fs');
const os      = require('os');

// ── Setup: preparar entorno antes de cargar la app ─────────────────────────

// Secret para firmar tokens JWT en los tests
process.env.DOWNLOAD_SECRET = 'secret-de-prueba-jest';
process.env.PORT = '3000';

// Usar un archivo de metadata temporal para no tocar el real
const tmpDb = path.join(os.tmpdir(), `metadata-test-${Date.now()}.json`);
fs.writeFileSync(tmpDb, '{}', 'utf-8');

// Parchar la ruta del DB antes de cargar los módulos
const metadataStorePath = path.resolve(__dirname, '../src/db/metadataStore.js');
const originalDbPath    = path.join(__dirname, '../src/db/metadata.json');

// Inyectamos la ruta temporal usando una variable de entorno
process.env.METADATA_DB_PATH = tmpDb;

// ── Cargar app ────────────────────────────────────────────────────────────

const app = require('../src/app');

// ── Limpieza al terminar ───────────────────────────────────────────────────

afterAll(() => {
    try { fs.unlinkSync(tmpDb); } catch (_) {}
});

// ==========================================================================
// TP-1  POST /files — subida exitosa
// ==========================================================================
describe('POST /files', () => {

    test('TP-1: sube un archivo .txt y responde 201 con fileId', async () => {
        const inicio = Date.now();

        const res = await request(app)
            .post('/files')
            .attach('file', Buffer.from('contenido de prueba'), {
                filename:    'prueba.txt',
                contentType: 'text/plain',
            });

        const tiempo = Date.now() - inicio;
        console.log(`  [MÉTRICA] TP-1 upload tiempo: ${tiempo} ms`);

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('fileId');
        expect(res.body.fileId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
    });

    // TP-2: sin campo file → 400
    test('TP-2: sin campo "file" responde 400', async () => {
        const res = await request(app).post('/files');
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('message');
    });

    // TP-3: tipo de archivo no permitido → 400
    test('TP-3: archivo .html (no permitido) responde 400', async () => {
        const res = await request(app)
            .post('/files')
            .attach('file', Buffer.from('<html></html>'), {
                filename:    'pagina.html',
                contentType: 'text/html',
            });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/no permitido/i);
    });

    // TP-4: archivo demasiado grande → 400
    test('TP-4: archivo > 10 MB responde 400', async () => {
        const grande = Buffer.alloc(11 * 1024 * 1024, 'x');
        const res = await request(app)
            .post('/files')
            .attach('file', grande, {
                filename:    'grande.txt',
                contentType: 'text/plain',
            });
        expect(res.status).toBe(400);
    });
});

// ==========================================================================
// TP-5 a TP-7  GET /files/:fileId
// ==========================================================================
describe('GET /files/:fileId', () => {

    let fileId;

    // Subir un archivo para usar en las pruebas GET
    beforeAll(async () => {
        const res = await request(app)
            .post('/files')
            .attach('file', Buffer.from('hola mundo'), {
                filename:    'hola.txt',
                contentType: 'text/plain',
            });
        fileId = res.body.fileId;
    });

    // TP-5: fileId válido → 200 con downloadUrl
    test('TP-5: fileId existente responde 200 con downloadUrl', async () => {
        const inicio = Date.now();
        const res    = await request(app).get(`/files/${fileId}`);
        const tiempo = Date.now() - inicio;
        console.log(`  [MÉTRICA] TP-5 getDownloadUrl tiempo: ${tiempo} ms`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('downloadUrl');
        expect(res.body.downloadUrl).toContain('/files/download?token=');
    });

    // TP-6: fileId inexistente → 404
    test('TP-6: fileId inexistente responde 404', async () => {
        const res = await request(app)
            .get('/files/00000000-0000-0000-0000-000000000000');
        expect(res.status).toBe(404);
    });
});

// ==========================================================================
// TP-8 a TP-11  GET /files/download?token=
// ==========================================================================
describe('GET /files/download', () => {

    // TP-8: flujo completo upload → URL → download
    test('TP-8: flujo completo — sube, obtiene URL y descarga el archivo', async () => {
        const contenido = 'archivo para descarga ' + Date.now();

        // 1. Upload
        const uploadRes = await request(app)
            .post('/files')
            .attach('file', Buffer.from(contenido), {
                filename: 'descarga.txt', contentType: 'text/plain',
            });
        expect(uploadRes.status).toBe(201);
        const fileId = uploadRes.body.fileId;

        // 2. Obtener URL firmada
        const urlRes = await request(app).get(`/files/${fileId}`);
        expect(urlRes.status).toBe(200);
        const token = urlRes.body.downloadUrl.split('token=')[1];

        // 3. Descargar
        const inicio  = Date.now();
        const dlRes   = await request(app).get(`/files/download?token=${token}`);
        const tiempo  = Date.now() - inicio;
        console.log(`  [MÉTRICA] TP-8 download tiempo: ${tiempo} ms`);

        expect(dlRes.status).toBe(200);
        expect(dlRes.text).toBe(contenido);
    });

    // TP-9: token de uso único — segundo uso debe fallar
    test('TP-9: token de un solo uso — segundo uso responde 403', async () => {
        // Subir archivo
        const up = await request(app)
            .post('/files')
            .attach('file', Buffer.from('one-time'), {
                filename: 'one.txt', contentType: 'text/plain',
            });
        const fileId = up.body.fileId;

        // Obtener URL
        const urlRes = await request(app).get(`/files/${fileId}`);
        const token  = urlRes.body.downloadUrl.split('token=')[1];

        // Primer uso → OK
        const first = await request(app).get(`/files/download?token=${token}`);
        expect(first.status).toBe(200);

        // Segundo uso → 403
        const second = await request(app).get(`/files/download?token=${token}`);
        expect(second.status).toBe(403);
    });

    // TP-10: sin token → 400
    test('TP-10: sin parámetro token responde 400', async () => {
        const res = await request(app).get('/files/download');
        expect(res.status).toBe(400);
    });

    // TP-11: token inválido → 403
    test('TP-11: token inválido responde 403', async () => {
        const res = await request(app)
            .get('/files/download?token=esto.no.es.valido');
        expect(res.status).toBe(403);
    });
});
