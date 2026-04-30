const express = require('express');
const router = express.Router();
const {
  getAllVehicles, getVehicleById, createVehicle,
  updateVehicle, deleteVehicle, getCategories, uploadVehicleImage
} = require('../controllers/vehicleController');
const { verifyToken, isAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', getAllVehicles);
router.get('/categories', getCategories);
router.get('/:id', getVehicleById);
router.post('/', verifyToken, isAdmin, createVehicle);
router.post('/:id/images', verifyToken, isAdmin, upload.single('image'), uploadVehicleImage);
router.put('/:id', verifyToken, isAdmin, updateVehicle);
router.delete('/:id', verifyToken, isAdmin, deleteVehicle);

module.exports = router;