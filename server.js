// server.js - Backend Node.js File
const express = require('express');
const multer = require('multer');  // is for 
const AWS = require('aws-sdk');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Configuration
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'testing1-bucket01';
const AWS_REGION = process.env.AWS_REGION || 'eu-north-1';

// Configure AWS SDK
AWS.config.update({ region: AWS_REGION });
const s3 = new AWS.S3();

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Routes
app.get('/', async (req, res) => {
    try {
        // Get all images from S3
        const data = await s3.listObjectsV2({ Bucket: S3_BUCKET }).promise();
        
        const images = [];
        if (data.Contents) {
            for (const obj of data.Contents) {
                const url = s3.getSignedUrl('getObject', {
                    Bucket: S3_BUCKET,
                    Key: obj.Key,
                    Expires: 3600
                });
                images.push({
                    name: obj.Key,
                    url: url
                });
            }
        }
        
        res.render('index', { images });
    } catch (error) {
        console.error('Error loading images:', error);
        res.render('index', { images: [] });
    }
});

app.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const timestamp = Date.now();
        const filename = `${timestamp}_${req.file.originalname}`;

        const params = {
            Bucket: S3_BUCKET,
            Key: filename,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
        };

        await s3.upload(params).promise();
        
        res.json({ success: true, message: 'Image uploaded successfully!' });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});