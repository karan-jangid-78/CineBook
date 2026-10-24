import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import {
  CheckCircle,
  Printer,
  Ticket,
  Calendar,
  Clock,
  MapPin,
  Film,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ConfirmationPage() {
  const { id } = useParams();
  const location = useLocation();

  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(!booking);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (booking) return;

    async function fetchBooking() {
      try {
        setLoading(true);
        const res = await api.get(`/bookings/${id}`);
        if (res.data.success) {
          setBooking(res.data.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch booking details');
      } finally {
        setLoading(false);
      }
    }

    fetchBooking();
  }, [id, booking]);

  if (loading) return <LoadingSpinner message="Generating confirmed cinema pass..." />;

  if (error || !booking) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 glass-card rounded-2xl text-center space-y-4">
        <Film className="w-12 h-12 text-red-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Booking Not Found</h3>
        <p className="text-xs text-gray-400">{error || 'Unable to retrieve your booking voucher.'}</p>
        <Link to="/" className="inline-block px-4 py-2 bg-amber-500 text-black text-xs font-bold rounded-xl">
          Back to Home
        </Link>
      </div>
    );
  }

  const { show, seats, bookingReference, totalAmount, paymentDetails, createdAt } = booking;

  const formatShowDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatShowTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Success Banner */}
      <div className="text-center space-y-3 mb-8">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
          <CheckCircle className="w-8 h-8 stroke-[2.5]" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
          Booking Confirmed!
        </h1>
        <p className="text-xs sm:text-sm text-gray-300">
          Your reservation is locked in the database. Grab your popcorn and enjoy the movie!
        </p>
      </div>

      {/* Cinematic Ticket Voucher Card */}
      <div className="rounded-3xl overflow-hidden bg-[#121826] border border-gray-700/80 shadow-2xl relative">
        {/* Ticket Header Bar */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-black">
          <div className="flex items-center space-x-2">
            <Ticket className="w-5 h-5" />
            <span className="font-display font-black text-lg tracking-wider">CINEBOOK PASS</span>
          </div>

          <div className="flex items-center space-x-2 font-mono text-xs font-bold">
            <span className="opacity-80">REF:</span>
            <span className="bg-black/90 text-amber-400 px-2.5 py-1 rounded-md tracking-wider">
              {bookingReference}
            </span>
          </div>
        </div>

        {/* Ticket Body */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-center">
          {/* Poster & Movie Title (1 col) */}
          <div className="flex sm:flex-col items-center sm:items-start space-x-4 sm:space-x-0 space-y-0 sm:space-y-3">
            <img
              src={show?.movie?.posterUrl}
              alt={show?.movie?.title}
              className="w-24 sm:w-full sm:max-w-[180px] aspect-[2/3] object-cover rounded-xl shadow-lg border border-gray-700"
            />
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white font-display">
                {show?.movie?.title}
              </h3>
              <p className="text-xs text-amber-400 font-medium">{show?.language || 'English'} • {show?.format || '2D'}</p>
            </div>
          </div>

          {/* Details (2 cols) */}
          <div className="md:col-span-2 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Cinema & Location</p>
                <p className="text-sm font-bold text-white mt-0.5">{show?.cinema?.name}</p>
                <p className="text-xs text-gray-400 flex items-center space-x-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-amber-500" />
                  <span>{show?.cinema?.location}</span>
                </p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Screen</p>
                <p className="text-sm font-bold text-white mt-0.5">{show?.screenName}</p>
                <span className="inline-block mt-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  {show?.format}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-800">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Date</p>
                <p className="text-xs sm:text-sm font-bold text-white mt-0.5 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  <span>{formatShowDate(show?.startTime)}</span>
                </p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Showtime</p>
                <p className="text-xs sm:text-sm font-bold text-white mt-0.5 flex items-center space-x-1.5 font-mono">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>{formatShowTime(show?.startTime)}</span>
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-800">
              <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold mb-1">
                Confirmed Seats ({seats?.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {seats?.map((seat) => (
                  <span
                    key={seat.seatNumber}
                    className="text-xs font-mono font-black px-3 py-1.5 rounded-lg bg-amber-500 text-black shadow-md"
                  >
                    {seat.seatNumber}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-800 flex items-center justify-between text-xs">
              <div>
                <p className="text-gray-400">Payment Status</p>
                <p className="text-emerald-400 font-semibold flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Simulated {paymentDetails?.method || 'Card'} Completed</span>
                </p>
              </div>

              <div className="text-right">
                <p className="text-gray-400">Total Paid</p>
                <p className="text-lg font-black text-amber-400 font-mono">₹{totalAmount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ticket Perforation / Barcode Strip */}
        <div className="bg-gray-900/90 border-t border-dashed border-gray-700 p-4 px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <div className="font-mono tracking-widest text-[11px]">
            ||||||| | ||||| |||| |||||||| |||| | ||||||||||| |||
          </div>
          <p className="text-[11px]">Show this confirmation pass or QR at cinema entry</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white font-medium px-5 py-2.5 rounded-xl border border-gray-700 text-xs sm:text-sm transition"
        >
          <Printer className="w-4 h-4 text-amber-400" />
          <span>Print / Save Voucher</span>
        </button>

        <Link
          to="/my-bookings"
          className="inline-flex items-center space-x-2 bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition"
        >
          <span>View All Bookings</span>
          <ArrowRight className="w-4 h-4" />
        </Link>

        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-gray-400 hover:text-white px-4 py-2.5 text-xs sm:text-sm transition"
        >
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
}
