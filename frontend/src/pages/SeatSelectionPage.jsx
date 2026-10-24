import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  AlertCircle,
  Ticket,
  ShieldCheck,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../context/BookingContext';
import SeatMap from '../components/SeatMap';
import ReservationTimer from '../components/ReservationTimer';
import LoadingSpinner from '../components/LoadingSpinner';

export default function SeatSelectionPage() {
  const { showId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, quickDemoLogin } = useAuth();
  const { setReservation } = useBooking();

  const [show, setShow] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [conflictError, setConflictError] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const fetchSeatAvailability = useCallback(async () => {
    try {
      setLoading(true);
      setConflictError(null);
      const res = await api.get(`/shows/${showId}/seats`);
      if (res.data.success) {
        setShow(res.data.data.show);
        setSeats(res.data.data.seats);
      }
    } catch (err) {
      setConflictError(err.response?.data?.message || 'Failed to load seat availability');
    } finally {
      setLoading(false);
    }
  }, [showId]);

  useEffect(() => {
    fetchSeatAvailability();
  }, [fetchSeatAvailability]);

  const handleToggleSeat = (seatNumber, seatData) => {
    setConflictError(null);
    if (selectedSeats.includes(seatNumber)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seatNumber));
    } else {
      // Limit to 8 seats per booking
      if (selectedSeats.length >= 8) {
        alert('You can select a maximum of 8 seats per booking.');
        return;
      }
      setSelectedSeats([...selectedSeats, seatNumber]);
    }
  };

  // Calculate pricing
  const selectedSeatObjects = selectedSeats.map((seatNum) => {
    return seats.find((s) => s.seatNumber === seatNum) || {
      seatNumber: seatNum,
      price: 220,
      tier: 'standard',
    };
  });

  const subtotal = selectedSeatObjects.reduce((acc, s) => acc + s.price, 0);

  const handleProceedToCheckout = async () => {
    if (selectedSeats.length === 0) return;

    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }

    try {
      setSubmitting(true);
      setConflictError(null);

      // Call concurrency reservation API
      const res = await api.post('/bookings/reserve', {
        showId,
        seats: selectedSeats,
      });

      if (res.data.success) {
        // Save reservation in context and proceed to checkout
        setReservation({
          reservationId: res.data.data.reservationId,
          showId,
          show,
          seats: res.data.data.seats,
          expiresAt: res.data.data.expiresAt,
          totalAmount: res.data.data.totalAmount,
        });

        navigate('/checkout');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'One or more selected seats are no longer available. Please choose different seats.';
      setConflictError(msg);
      // Refresh seat layout to show the newly taken seats
      await fetchSeatAvailability();
      // Deselect seats that are now taken
      setSelectedSeats([]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInstantDemoLoginAndProceed = async () => {
    await quickDemoLogin('user');
    setAuthModalOpen(false);
    // Proceed immediately after state update
    setTimeout(() => {
      handleProceedToCheckout();
    }, 150);
  };

  if (loading && !show) {
    return <LoadingSpinner message="Loading interactive seat layout..." />;
  }

  const formatShowTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="min-h-screen pb-28 pt-4">
      {/* Top Breadcrumb & Showtime Info Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white font-display">
                {show?.movie?.title || 'Seat Selection'}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {show?.cinema?.name} • {show?.screenName} • {formatShowTime(show?.startTime)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchSeatAvailability}
              className="flex items-center space-x-1.5 text-xs text-gray-400 hover:text-white bg-gray-800/60 px-3 py-1.5 rounded-lg border border-gray-700 transition"
              title="Refresh availability"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <span className="text-xs px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold uppercase">
              {show?.format || '2D'}
            </span>
          </div>
        </div>

        {/* Conflict / Error Banner */}
        {conflictError && (
          <div className="mt-4 p-4 rounded-xl bg-red-950/70 border border-red-500 text-red-200 flex items-start space-x-3 animate-shake">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white">Seat Unavailable (409 Conflict)</h4>
              <p className="text-xs mt-0.5 leading-relaxed">{conflictError}</p>
            </div>
          </div>
        )}
      </div>

      {/* Seat Map Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-4 sm:p-8 rounded-3xl bg-[#121826] border border-gray-800 shadow-2xl">
          <SeatMap
            seats={seats}
            selectedSeats={selectedSeats}
            onToggleSeat={handleToggleSeat}
            pricing={show?.pricing}
          />
        </div>
      </div>

      {/* Floating Checkout Bottom Bar */}
      {selectedSeats.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 glass-panel border-t border-amber-500/30 py-3 sm:py-4 px-4 sm:px-8 shadow-2xl animate-slideUp">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                {selectedSeats.length}
              </div>

              <div>
                <p className="text-xs text-gray-400">
                  Selected Seats: <strong className="text-white">{selectedSeats.join(', ')}</strong>
                </p>
                <p className="text-base sm:text-lg font-black text-amber-400">
                  ₹{subtotal}{' '}
                  <span className="text-xs font-normal text-gray-400">(taxes extra)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button
                disabled={submitting}
                onClick={handleProceedToCheckout}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold px-8 py-3 rounded-xl shadow-lg shadow-amber-500/20 hover:scale-105 transition-all text-sm"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Reserving Seats...</span>
                  </>
                ) : (
                  <>
                    <Ticket className="w-4 h-4" />
                    <span>Proceed to Checkout &rarr;</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Quick Sign In / Demo Login Prompt */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121826] border border-gray-700 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Sign In to Hold Seats</h3>
                <p className="text-xs text-gray-400">Your selection will be reserved for 5 minutes</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 text-xs text-gray-300 space-y-1">
              <p>Selected Seats: <strong className="text-amber-400">{selectedSeats.join(', ')}</strong></p>
              <p>Subtotal: <strong className="text-white">₹{subtotal}</strong></p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleInstantDemoLoginAndProceed}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold py-3 rounded-xl shadow-lg transition"
              >
                <Sparkles className="w-4 h-4" />
                <span>Instant 1-Click Demo Login</span>
              </button>

              <button
                onClick={() => navigate('/login')}
                className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold rounded-xl transition"
              >
                Sign In with My Account
              </button>

              <button
                onClick={() => setAuthModalOpen(false)}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-400 pt-1"
              >
                Cancel and return to seat map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
