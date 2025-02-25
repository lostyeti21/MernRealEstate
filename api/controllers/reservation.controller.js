import Listing from '../models/listing.model.js';
import Reservation from '../models/reservation.model.js';
import Notification from '../models/notification.model.js';
import { errorHandler } from '../utils/error.js';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export const createReservation = async (req, res) => {
  try {
    const {
      listingId,
      userId,
      selectedTimeSlots,
      landlordId,
      propertyName,
      viewerName,
      viewerEmail,
      viewerPhone,
      flexibleViewingTime
    } = req.body;

    // Debug log
    console.log('Received selectedTimeSlots:', selectedTimeSlots);

    // First, fetch the listing to get the owner details
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    // Validate required fields
    if (!listingId || !userId || !selectedTimeSlots || !landlordId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        received: { listingId, userId, selectedTimeSlots: !!selectedTimeSlots, landlordId }
      });
    }

    // Validate all time slots
    const validatedTimeSlots = [];
    for (const timeSlot of selectedTimeSlots) {
      try {
        // Check if the day is in YYYY-MM-DD format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(timeSlot.day)) {
          throw new Error('Invalid date format');
        }
        
        const date = new Date(timeSlot.day);
        
        // Validate that it's a valid date
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date');
        }

        // Validate that the date is not in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) {
          throw new Error('Cannot schedule viewings in the past');
        }

        validatedTimeSlots.push({
          date,
          startTime: timeSlot.start,
          endTime: timeSlot.end
        });
      } catch (error) {
        console.error('Date validation error:', error);
        return res.status(400).json({
          success: false,
          message: error.message,
          receivedDate: timeSlot.day
        });
      }
    }

    // Create reservations for each time slot
    const savedReservations = [];
    for (const timeSlot of validatedTimeSlots) {
      const reservation = new Reservation({
        listing: listingId,
        tenant: userId,
        landlord: landlordId,
        date: timeSlot.date,
        startTime: timeSlot.startTime,
        endTime: timeSlot.endTime,
        status: 'pending'
      });

      console.log('Creating reservation with data:', {
        listing: listingId,
        tenant: userId,
        landlord: landlordId,
        date: timeSlot.date,
        startTime: timeSlot.startTime,
        endTime: timeSlot.endTime
      });

      const savedReservation = await reservation.save();
      console.log('Reservation saved:', savedReservation._id);
      savedReservations.push(savedReservation);
    }

    // Create a single notification for all reservations
    const notification = new Notification({
      type: 'viewing_request',
      to: landlordId,
      from: userId,
      title: 'New Viewing Request',
      content: `${viewerName} has requested to view ${propertyName} on ${savedReservations.length} different days`,
      data: {
        reservations: savedReservations,
        listing: listing,
        tenant: {
          username: viewerName,
          email: viewerEmail,
          phone: viewerPhone
        }
      }
    });

    const savedNotification = await notification.save();
    console.log('Notification saved:', savedNotification._id);

    res.status(201).json({
      success: true,
      reservations: savedReservations,
      notification: savedNotification
    });

  } catch (error) {
    console.error('Reservation creation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating reservation'
    });
  }
};

export const acceptReservation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { selectedTimes } = req.body;
    const userId = req.user.id;

    console.log('Accepting reservation:', {
      reservationId: id,
      selectedTimes,
      userId
    });

    const reservation = await Reservation.findById(id).populate('listing');
    if (!reservation) {
      console.log('Reservation not found:', id);
      return next(errorHandler(404, 'Reservation not found'));
    }

    console.log('Found reservation:', {
      id: reservation._id,
      listing: {
        id: reservation.listing?._id,
        userRef: reservation.listing?.userRef
      },
      user: reservation.user,
      status: reservation.status
    });

    // Verify the user is authorized to accept this reservation
    if (reservation.listing.userRef.toString() !== userId) {
      console.log('Authorization failed:', {
        listingUserRef: reservation.listing.userRef.toString(),
        requestUserId: userId
      });
      return next(errorHandler(403, 'You can only accept your own listing reservations'));
    }

    // Update reservation status
    reservation.status = 'accepted';
    await reservation.save();
    console.log('Updated reservation status to accepted');

    // Find and update the notification
    const notification = await Notification.findOne({
      'data.reservations': { $elemMatch: { _id: id } }
    });

    if (notification) {
      // Update the specific reservation in the array
      notification.data.reservations = notification.data.reservations.map(res => 
        res._id.toString() === id ? { ...res, status: 'accepted' } : res
      );
      await notification.save();
    }

    res.status(200).json({ success: true, message: 'Reservation accepted' });
  } catch (error) {
    console.error('Error in acceptReservation:', error);
    next(error);
  }
};

export const rejectReservation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    // Find and update the reservation
    const reservation = await Reservation.findById(id);
    if (!reservation) {
      return next(errorHandler(404, 'Reservation not found'));
    }

    reservation.status = 'rejected';
    reservation.rejectionReason = rejectionReason;
    await reservation.save();

    // Find and update the associated notification
    const notification = await Notification.findOne({
      'data.reservation': id,
      type: 'viewing_request'
    });

    if (notification) {
      // Update notification status and data
      notification.status = 'rejected';
      notification.content = rejectionReason;
      notification.data = {
        ...notification.data,
        reservation: {
          ...notification.data.reservation,
          status: 'rejected',
          rejectionReason: rejectionReason
        }
      };
      await notification.save();
    }

    res.status(200).json({
      success: true,
      message: 'Reservation rejected successfully',
      reservation,
      notification
    });
  } catch (error) {
    next(error);
  }
};
