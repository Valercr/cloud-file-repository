const express = require('express');
const router = express.Router();

const { authenticate, authorize } = require('../middleware/authMiddleware');

const {upload, uploadFile, generateLink, downloadFile} = require('../controllers/fileController');

router.post('/upload', authenticate, authorize('uploader'), upload.single('file'), uploadFile);
router.post('/link', authenticate, authorize('uploader'), generateLink);
router.get('/download', downloadFile);

module.exports = router;