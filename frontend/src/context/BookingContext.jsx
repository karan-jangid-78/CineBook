import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const BookingContext = createContext(null);

export function BookingProvider({ children }) {
  const [activeReservation, setActiveReservation] = useState(() => {
    const saved = sessionStorage.getItem('cinebook_active_reservation');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      // Check if already expired
      if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
        sessionStorage.removeItem('cinebook_active_reservation');
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Sync remaining seconds
  useEffect(() => {
    if (!activeReservation || !activeReservation.expiresAt) {
      setRemainingSeconds(0);
      return;
    }

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((new Date(activeReservation.expiresAt).getTime() - Date.now()) / 1000));
      setRemainingSeconds(diff);
      if (diff === 0) {
        // Expired!
        setActiveReservation(null);
        sessionStorage.removeItem('cinebook_active_reservation');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeReservation]);

  const setReservation = useCallback((data) => {
    setActiveReservation(data);
    if (data) {
      sessionStorage.setItem('cinebook_active_reservation', JSON.stringify(data));
    } else {
      sessionStorage.removeItem('cinebook_active_reservation');
    }
  }, []);

  const releaseCurrentHold = useCallback(async () => {
    if (!activeReservation?.reservationId) return;
    try {
      await api.post('/bookings/release', {
        reservationId: activeReservation.reservationId,
      });
    } catch (err) {
      console.warn('Failed to explicitly release hold:', err.message);
    } finally {
      setReservation(null);
    }
  }, [activeReservation, setReservation]);

  return (
    <BookingContext.Provider
      value={{
        activeReservation,
        remainingSeconds,
        isHoldingSeats: Boolean(activeReservation && remainingSeconds > 0),
        setReservation,
        releaseCurrentHold,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
}
