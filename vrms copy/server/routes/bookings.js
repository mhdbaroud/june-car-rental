const express = require('express');
const router = express.Router();
const {
  createBooking, createAndCompleteBooking, getUserBookings, getAllBookings,
  getBookingById, cancelBooking, extendBooking,
  requestCancellation, approveCancellation, rejectCancellation,
  getBookedDates
} = require('../controllers/bookingController');
const { verifyToken, isAdmin, isStaff } = require('../middleware/auth');

router.post('/', verifyToken, createBooking);
router.post('/complete', verifyToken, createAndCompleteBooking);
router.get('/my', verifyToken, getUserBookings);
router.get('/all', verifyToken, isStaff, getAllBookings);

// Public: get booked dates for a vehicle (must be before /:id)
router.get('/booked-dates/:vehicle_id', getBookedDates);

router.get('/:id', verifyToken, getBookingById);

// Customer: request cancellation
router.put('/:id/request-cancellation', verifyToken, requestCancellation);

// Admin: approve or reject cancellation request
router.put('/:id/approve-cancellation', verifyToken, isStaff, approveCancellation);
router.put('/:id/reject-cancellation', verifyToken, isStaff, rejectCancellation);

// Staff: direct cancel (bypass request flow)
router.put('/:id/cancel', verifyToken, isStaff, cancelBooking);

router.put('/:id/extend', verifyToken, extendBooking);

module.exports = router;