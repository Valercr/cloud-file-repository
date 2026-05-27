const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const storage = multer.diskStorage({
    destination: 'src/storage/',
    filename: (req, file, cb) => {
        const fileId = uuidv4();
        file.fileId = fileId;
        cb(null, fileId + '-' + file.originalname);
    }
});

const upload = multer({ storage });

function uploadFile(req, res) {
    const fileId = req.file.fileId;

    console.log(`UPLOAD: Client ${req.client.clientId} uploaded file ${fileId}`);

    res.json({ fileId });
}

function generateLink(req, res) {
    try {
        const { fileId } = req.body;

        if (!fileId) {
            return res.status(400).json({ message: 'fileId is required' });
        }

        console.log(`LINK: Client ${req.client.clientId} generated link for ${fileId}`);

        const token = jwt.sign({ fileId },process.env.DOWNLOAD_SECRET,{ expiresIn: '5m' });

        const link = `http://localhost:3000/files/download?token=${token}`;

        res.json({ link });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

function downloadFile(req, res) {
    const { token } = req.query;

    try {
        const decoded = jwt.verify(token, process.env.DOWNLOAD_SECRET);
        const fileId = decoded.fileId;

        console.log(`DOWNLOAD: File ${fileId} accessed`);

        const files = fs.readdirSync('src/storage');
        const file = files.find(f => f.startsWith(fileId));

        if (!file) {
            return res.status(404).send('File not found');
        }

        const filePath = path.join(__dirname, '../storage', file);
        res.download(filePath);

    } catch (err) {
        console.log('FAILED DOWNLOAD ATTEMPT');
        return res.status(403).send('Invalid or expired link');
    }
}

module.exports = {upload,uploadFile, generateLink, downloadFile};