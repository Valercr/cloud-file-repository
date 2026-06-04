# Explicación del proyecto

Este proyecto es una API en Node.js con Express para gestionar archivos en la nube de forma segura. Su objetivo es permitir que ciertas aplicaciones autenticadas suban archivos, generen enlaces de descarga y controlen quién puede acceder a cada recurso.

## Qué hace el sistema

1. Una app se autentica con un token JWT.
2. Si tiene el rol correcto, puede subir un archivo.
3. Al subirlo, el sistema guarda el archivo en disco y registra sus metadatos.
4. La misma app puede generar un enlace de descarga para ese archivo.
5. Ese enlace lleva un token firmado, con expiración y uso único.
6. Cualquier usuario que tenga ese enlace puede descargar el archivo.

## Estructura general

La solución está dividida en capas para que sea más fácil de entender y mantener:

- `src/app.js`: arranque de la aplicación.
- `src/routes/`: define las rutas HTTP.
- `src/controllers/`: recibe la petición y devuelve la respuesta.
- `src/middleware/`: valida autenticación y permisos.
- `src/services/`: contiene la lógica de negocio.
- `src/db/`: guarda los metadatos del sistema.
- `src/utils/`: funciones auxiliares.
- `src/storage/`: carpeta donde quedan los archivos subidos.

## Explicación archivo por archivo

### `src/app.js`

Es el punto de entrada del servidor.

Qué hace:

- Carga variables de entorno con `dotenv`.
- Crea la aplicación de Express.
- Habilita `express.json()` para leer cuerpos en formato JSON.
- Monta las rutas de archivos en `/files`.
- Define un manejador global de errores.
- Levanta el servidor en el puerto indicado por `PORT` o en `3000`.

En resumen, este archivo solo arma el servidor y conecta las demás piezas.

### `src/routes/fileRoutes.js`

Define los endpoints del sistema.

Rutas principales:

- `POST /files/upload`: sube un archivo.
- `POST /files/link`: genera un enlace de descarga.
- `GET /files`: lista archivos del cliente autenticado.
- `GET /files/:fileId/metadata`: obtiene metadata de un archivo.
- `DELETE /files/:fileId`: elimina un archivo.
- `GET /files/download`: descarga pública usando un token firmado.

También aplica los middleware de autenticación y autorización donde corresponde.

### `src/controllers/fileController.js`

Es la capa que recibe la petición HTTP y responde al cliente.

Qué maneja:

- La configuración de `multer` para subir archivos.
- La validación de tipos de archivo permitidos.
- El límite de tamaño de subida.
- La lectura de parámetros como `fileId` y `token`.
- La respuesta HTTP en formato JSON o texto.

Funciones principales:

- `uploadFile`: registra el archivo subido.
- `generateLink`: pide al servicio crear el enlace seguro.
- `downloadFile`: resuelve el token y descarga el archivo.
- `deleteFile`: elimina un archivo.
- `listFiles`: lista los archivos del cliente.
- `getFileMetadata`: devuelve la metadata de un archivo.

En pocas palabras, aquí no vive la lógica pesada; solo la parte HTTP.

### `src/middleware/authMiddleware.js`

Protege las rutas que requieren autenticación.

Qué hace:

- `authenticate`: revisa si existe el header `Authorization`.
- Verifica el JWT del cliente con `verifyToken`.
- Guarda la información del cliente en `req.client`.
- `authorize(roleRequired)`: valida que el cliente tenga el rol necesario.

Ejemplo de uso:

- Para subir archivos, se exige el rol `uploader`.
- Para otras rutas protegidas, solo hace falta estar autenticado.

### `src/services/fileService.js`

Es el corazón de la lógica del negocio.

Qué hace:

- Registra una subida exitosa.
- Genera enlaces de descarga firmados.
- Verifica tokens de descarga.
- Evita que un token se use más de una vez.
- Borra archivos del disco y de la metadata.
- Devuelve metadata y listas de archivos.

Funciones principales:

- `registerUpload`: guarda la metadata del archivo subido.
- `generateDownloadLink`: crea el JWT de descarga con expiración.
- `resolveDownload`: valida el token, comprueba uso único y devuelve la ruta del archivo.
- `removeFile`: borra el archivo y su metadata.
- `getMetadata`: obtiene metadata solo si el cliente es el dueño.
- `listFiles`: lista los archivos del cliente.

Este archivo es importante porque concentra las reglas del sistema y no mezcla lógica HTTP ni almacenamiento.

### `src/db/metadataStore.js`

Guarda la metadata de los archivos en un archivo JSON local.

Qué guarda por cada archivo:

- `fileId`
- `ownerClientId`
- `originalName`
- `storedName`
- `mimeType`
- `size`
- `createdAt`
- `permissions`

Funciones principales:

- `saveFileMetadata`: crea un registro nuevo.
- `getFileMetadata`: busca un archivo por id.
- `deleteFileMetadata`: elimina el registro.
- `listFilesByClient`: devuelve los archivos de un cliente.

Este módulo funciona como una base de datos simple, pero basada en JSON.

### `src/utils/tokenUtils.js`

Contiene las funciones para trabajar con JWT de autenticación.

Qué hace:

- `generateToken(clientId, role)`: crea un token para una app.
- `verifyToken(token)`: valida ese token.

Este JWT es el que usan las aplicaciones para autenticarse contra la API.

### `src/utils/tokenBlacklist.js`

Implementa una lista negra en memoria para tokens de descarga.

Qué hace:

- `isTokenUsed(token)`: verifica si ya se usó.
- `markTokenAsUsed(token)`: marca el token como consumido.

Se usa para garantizar que el link de descarga sea de un solo uso.

### `src/utils/auditLogger.js`

Registra eventos importantes de seguridad.

Qué hace:

- Escribe eventos en `audit.log`.
- También los imprime en consola.

Eventos que registra:

- `UPLOAD`
- `LINK_GENERATED`
- `DOWNLOAD`
- `DELETE`

Sirve para trazabilidad y auditoría.

## Carpetas de soporte

### `src/storage/`

Aquí se guardan físicamente los archivos subidos.

Cada archivo se renombra con un UUID para evitar colisiones y para que no dependa del nombre original.

### `src/db/metadata.json`

Archivo donde queda persistida la metadata de los archivos.

Si se reinicia la aplicación, la metadata sigue disponible porque se guarda en disco.

## Archivos auxiliares

### `token-test.js`

Script pequeño para probar la generación de JWT.

Qué hace:

- Llama a `generateToken("app1", "uploader")`.
- Imprime el token en consola.

Sirve como comprobación rápida de que el sistema de autenticación funciona.

### `package.json`

Define el proyecto Node.js.

Contiene:

- Nombre y versión del proyecto.
- Dependencias principales.
- Script de pruebas.

Dependencias usadas:

- `express`: servidor HTTP.
- `dotenv`: variables de entorno.
- `jsonwebtoken`: creación y validación de JWT.
- `multer`: subida de archivos.
- `uuid`: generación de identificadores únicos.

## Flujo completo

1. La app genera o recibe un token JWT.
2. Envía la petición a `/files/upload` o `/files/link`.
3. `authMiddleware` valida identidad y rol.
4. `fileController` recibe la solicitud.
5. `fileService` ejecuta la lógica real.
6. `metadataStore` guarda o consulta datos.
7. `auditLogger` registra la operación.
8. Si se generó un enlace, el usuario final descarga desde `/files/download`.

## Idea principal del diseño

El proyecto intenta separar responsabilidades para que cada archivo tenga una sola función:

- autenticación en middleware,
- rutas en router,
- control HTTP en controller,
- reglas de negocio en service,
- persistencia simple en db,
- utilidades en utils.

Eso hace que el proyecto sea más fácil de leer, modificar y explicar.

## Resumen corto

Este sistema sirve para almacenar archivos, controlar quién puede subirlos o administrarlos, generar enlaces de descarga seguros y auditar las acciones importantes. La arquitectura está organizada por capas para que cada archivo cumpla un rol específico.