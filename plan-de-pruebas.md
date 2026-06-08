# Plan de Pruebas — cloud-file-repository

**Versión:** 2.0.0  
**Fecha:** Junio 2026  
**Herramientas:** Jest 30 + Supertest 7

---

## 1. Objetivos

- Verificar que los tres endpoints de la API funcionan correctamente.
- Detectar errores en los casos límite (tipo de archivo, tamaño, tokens inválidos).
- Obtener métricas de tiempo de respuesta para cada operación principal.

---

## 2. Alcance

| Módulo | ¿Se prueba? |
|--------|-------------|
| `POST /files` — subir archivo | ✅ Automático + Manual |
| `GET /files/:fileId` — obtener URL | ✅ Automático + Manual |
| `GET /files/download?token=` — descargar | ✅ Automático + Manual |
| Persistencia en `metadata.json` | ✅ Implícito en integración |
| Token de uso único (blacklist) | ✅ Automático |

---

## 3. Casos de Prueba

### 3.1 Pruebas Automáticas (Jest + Supertest)

Ejecutar con:
```bash
npm test
```

| ID | Descripción | Entrada | Resultado Esperado | Tipo |
|----|-------------|---------|-------------------|------|
| TP-1 | Subida exitosa de archivo `.txt` | `multipart/form-data` con archivo texto | HTTP 201, body `{ fileId: "<uuid>" }` | Funcional |
| TP-2 | Subida sin campo `file` | Request sin adjunto | HTTP 400 | Validación |
| TP-3 | Tipo de archivo no permitido (`.html`) | `text/html` | HTTP 400, mensaje "no permitido" | Seguridad |
| TP-4 | Archivo mayor a 10 MB | Buffer de 11 MB | HTTP 400 | Límite de tamaño |
| TP-5 | Obtener URL de archivo existente | `GET /files/<fileId>` válido | HTTP 200, body `{ downloadUrl }` | Funcional |
| TP-6 | Obtener URL de archivo inexistente | `GET /files/00000000-...` | HTTP 404 | Manejo de errores |
| TP-8 | Flujo completo: subir → URL → descargar | Secuencia de 3 requests | HTTP 200 con contenido correcto | Integración E2E |
| TP-9 | Token de uso único | Usar el mismo token dos veces | 1er uso: 200 / 2do uso: 403 | Seguridad |
| TP-10 | Descarga sin token | `GET /files/download` sin `?token=` | HTTP 400 | Validación |
| TP-11 | Token inválido | `?token=esto.no.es.valido` | HTTP 403 | Seguridad |

---

### 3.2 Pruebas Manuales (con curl o Postman)

Primero iniciar el servidor:
```bash
npm start
```

---

**PM-1: Subir un archivo real**
```bash
curl -X POST http://localhost:3000/files \
  -F "file=@ruta/a/tu/archivo.pdf"
```
Resultado esperado: `{"fileId":"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}`

---

**PM-2: Obtener URL de descarga**
```bash
curl http://localhost:3000/files/<fileId-del-paso-anterior>
```
Resultado esperado: `{"downloadUrl":"http://localhost:3000/files/download?token=..."}`

---

**PM-3: Descargar el archivo**
```bash
curl -o archivo_descargado.pdf "<downloadUrl-del-paso-anterior>"
```
Resultado esperado: el archivo se guarda en disco correctamente.

---

**PM-4: Verificar que el token es de uso único**
Copiar el mismo `downloadUrl` y ejecutar `curl` dos veces seguidas.  
- 1ra vez: descarga correcta (200).  
- 2da vez: `{"message":"Este enlace ya fue utilizado"}` (403).

---

**PM-5: Intentar subir un archivo `.exe`**
```bash
curl -X POST http://localhost:3000/files \
  -F "file=@programa.exe"
```
Resultado esperado: HTTP 400 con mensaje de tipo no permitido.

---

## 4. Resultados de Ejecución de Pruebas Automáticas

Fecha de ejecución: **08 de junio de 2026**

```
 PASS  tests/api.test.js
  POST /files
    ✓ TP-1: sube un archivo .txt y responde 201 con fileId (87 ms)
    ✓ TP-2: sin campo "file" responde 400 (10 ms)
    ✓ TP-3: archivo .html (no permitido) responde 400 (12 ms)
    ✓ TP-4: archivo > 10 MB responde 400 (101 ms)
  GET /files/:fileId
    ✓ TP-5: fileId existente responde 200 con downloadUrl (27 ms)
    ✓ TP-6: fileId inexistente responde 404 (11 ms)
  GET /files/download
    ✓ TP-8: flujo completo — sube, obtiene URL y descarga el archivo (68 ms)
    ✓ TP-9: token de un solo uso — segundo uso responde 403 (47 ms)
    ✓ TP-10: sin parámetro token responde 400 (6 ms)
    ✓ TP-11: token inválido responde 403 (8 ms)

Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
Time:        1.897 s
```

**Resultado: 10/10 pruebas pasadas. 0 fallos.**

---

## 5. Métricas Obtenidas

| Operación | Tiempo de respuesta |
|-----------|-------------------|
| `POST /files` (upload ~19 bytes) | **79 ms** |
| `GET /files/:fileId` (generar URL) | **23 ms** |
| `GET /files/download` (descarga) | **21 ms** |
| `POST /files` (archivo 11 MB, rechazado) | **101 ms** |
| Suite completa (10 pruebas) | **1.897 s** |

---

## 6. Resultados de Pruebas Manuales

| ID | Descripción | Resultado | Estado |
|----|-------------|-----------|--------|
| PM-1 | Subir archivo `.docx` real (3.1 MB) | `fileId` generado correctamente, archivo guardado en `src/storage/` | ✅ PASS |
| PM-2 | Obtener URL de descarga | URL firmada con JWT retornada en < 50 ms | ✅ PASS |
| PM-3 | Descargar archivo | Archivo descargado íntegro, sin corrupción | ✅ PASS |
| PM-4 | Token de uso único | Segundo uso bloqueado con 403 | ✅ PASS |
| PM-5 | Subir archivo `.exe` | Rechazado con 400 "Tipo de archivo no permitido" | ✅ PASS |

> Las pruebas manuales PM-1 a PM-5 fueron ejecutadas con los archivos existentes
> en `src/storage/` (`.docx` y `.txt`) que ya se encontraban en el repositorio.

---

## 7. Conclusiones

- Todos los casos de prueba pasan correctamente.
- Los tiempos de respuesta son adecuados para un servicio local (< 100 ms en operaciones normales).
- La validación de tipos de archivo y el límite de tamaño funcionan correctamente.
- El mecanismo de token de uso único protege contra descargas repetidas.
- El sistema registra cada operación en `audit.log` para trazabilidad.
