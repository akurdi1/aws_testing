// server.js - Backend Node.js File (AWS SDK v3 version)

import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// === Setup ===
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// --- Environment / Config ---
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'testing1-bucket01';
const AWS_REGION = process.env.AWS_REGION || 'eu-north-1';
const PORT = process.env.PORT || 5000;

// --- Fix for __dirname in ES modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configure AWS S3 Client ---
const s3 = new S3Client({ region: AWS_REGION });

// --- View Engine ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// --- Routes ---
// Home route: List all images
app.get('/', async (req, res) => {
  try {
    const data = await s3.send(new ListObjectsV2Command({ Bucket: S3_BUCKET }));
    const images = [];

    if (data.Contents) {
      for (const obj of data.Contents) {
        const url = await getSignedUrl(s3, new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: obj.Key,
        }), { expiresIn: 3600 });

        images.push({ name: obj.Key, url });
      }
    }

    res.render('index', { images });
  } catch (error) {
    console.error('Error loading images:', error);
    res.render('index', { images: [] });
  }
});

// Upload route
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const timestamp = Date.now();
    const filename = `${timestamp}_${req.file.originalname}`;

    const uploadParams = {
      Bucket: S3_BUCKET,
      Key: filename,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    await s3.send(new PutObjectCommand(uploadParams));

    res.json({ success: true, message: 'Image uploaded successfully!' });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Start Server ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
