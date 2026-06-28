const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Controllers
const authController = require('../controllers/authController');
const dataController = require('../controllers/dataController');
const queryController = require('../controllers/queryController');
const analyticsController = require('../controllers/analyticsController');

// Authentication routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// Protected routes (require JWT)
const auth = authController.authenticateToken;

// Dataset routes
router.post('/datasets/upload', auth, upload.single('dataset'), dataController.uploadDataset);
router.get('/datasets', auth, dataController.getDatasets);
router.get('/datasets/:id', auth, dataController.getDatasetDetails);
router.delete('/datasets/:id', auth, dataController.deleteDataset);
router.post('/datasets/load-samples', auth, dataController.loadSamples);

// SQL Query terminal routes
router.post('/query/execute', auth, queryController.executeQuery);
router.get('/query/history', auth, queryController.getQueryHistory);

// Analytics & ML routes
router.post('/analytics/correlation', auth, analyticsController.getCorrelationMatrix);
router.post('/analytics/regression', auth, analyticsController.getRegression);
router.post('/analytics/kmeans', auth, analyticsController.getKMeans);
router.post('/analytics/anomalies', auth, analyticsController.getAnomalies);

module.exports = router;
