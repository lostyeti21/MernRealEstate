import Listing from '../models/listing.model.js';
import Reservation from '../models/reservation.model.js';
import { errorHandler } from '../utils/error.js';

export const createReservation = async (req, res, next) => {
  try {
    const { listingId, userId, timeSlots } = req.body;

    // Validate input
    if (!listingId || !userId || !timeSlots || timeSlots.length === 0) {
      return next(errorHandler(400, 'Invalid reservation details'));
    }

    // Find the listing
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return next(errorHandler(404, 'Listing not found'));
    }

    // Create new reservation
    const newReservation = new Reservation({
      listing: listingId,
      user: userId,
      timeSlots: timeSlots,
      status: 'pending'
    });

    await newReservation.save();

    // Update listing with interested user and reservation
    await Listing.findByIdAndUpdate(listingId, {
      $addToSet: { 
        interestedUsers: userId,
        reservations: newReservation._id 
      }
    });

    res.status(201).json({ 
      success: true, 
      message: 'Reservation created successfully', 
      reservation: newReservation 
    });
  } catch (error) {
    next(errorHandler(500, 'Error creating reservation'));
  }
};
