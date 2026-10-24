import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  CreditCard,
  ShieldCheck,
  Clock,
  ArrowLeft,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Film,
} from 'lucide-react';
import api from '../services/api';
import { useBooking } from '../context/BookingContext';
import ReservationTimer from '../components/ReservationTimer';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { activeReservation, isHoldingSeats, setReservation, releaseCurrentHold } = useBooking();

  const [paymentMethod, setPaymentMethod] = useState('SIMULATED_CARD');
  const [cardNumber, setCardNumber] = useState('4111 •••• •••• 1111');
  const [cardHolder, setCardHolder] = useState('CineBook Guest');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('888');
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!activeReservation || !activeReservation.seats || activeReservation.seats.length === 0) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 glass-card rounded-2xl text-center space-y-4">
        <Clock className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">No Active Reservation</h2>
        <p className="text-xs text-gray-400">
          Your seat hold session may have expired or you haven't selected any seats yet.
        </p>
        <Link
          to="/"
          className="inline-block px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition"
        >
          Browse Movies & Reselect Seats
        </Link>
      </div>
    );
  }

  const { show, seats, totalAmount, reservationId } = activeReservation;

  // Compute fee breakdown
  const subtotal = seats.reduce((sum, s) => sum + (s.price || 220), 0);
  const convenienceFee = 30;
  const tax = Math.round(convenienceFee * 0.18);
  const grandTotal = subtotal + convenienceFee + tax;

  const handleSimulatePayment = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setErrorMessage(null);

    try {
      // Execute booking confirmation
      const res = await api.post('/bookings/confirm', {
        reservationId,
        paymentDetails: {
          method: paymentMethod,
          transactionId: `SIM_TXN_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        },
      });

      if (res.data.success) {
        // Clear temporary hold
        setReservation(null);
        // Navigate to confirmation page
        const bookingId = res.data.data.booking._id;
        navigate(`/confirmation/${bookingId}`, {
          state: { booking: res.data.data.booking },
        });
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Failed to confirm booking. Your hold may have expired. Please reselect your seats.';
      setErrorMessage(msg);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelHold = async () => {
    if (confirm('Are you sure you want to cancel this reservation and release your seats?')) {
      await releaseCurrentHold();
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Back button */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={handleCancelHold}
          className="inline-flex items-center space-x-1.5 text-xs text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Cancel & Release Seats</span>
        </button>

        <span className="text-xs font-mono text-gray-400">
          Reservation ID: <strong className="text-gray-200">{reservationId.slice(-8)}</strong>
        </span>
      </div>

      {/* Main Grid: Left = Summary & Timer, Right = Simulated Payment Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Summary & Timer (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Reservation Hold Countdown */}
          <ReservationTimer />

          {/* Booking Summary Card */}
          <div className="p-6 rounded-2xl bg-[#121826] border border-gray-800 space-y-5">
            <h3 className="text-base font-bold text-white pb-3 border-b border-gray-800 font-display">
              Booking Overview
            </h3>

            {/* Movie Preview */}
            <div className="flex space-x-3">
              <img
                src={show?.movie?.posterUrl}
                alt={show?.movie?.title}
                className="w-16 h-24 rounded-lg object-cover bg-gray-900 border border-gray-800 flex-shrink-0"
              />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white line-clamp-1">
                  {show?.movie?.title || 'Selected Movie'}
                </h4>
                <p className="text-xs text-amber-400 font-medium">{show?.cinema?.name}</p>
                <p className="text-[11px] text-gray-400">{show?.screenName}</p>
                <p className="text-[11px] text-gray-300 font-mono">
                  {show?.startTime ? new Date(show.startTime).toLocaleString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }) : ''}
                </p>
              </div>
            </div>

            {/* Seats Badges */}
            <div className="pt-2">
              <p className="text-xs text-gray-400 mb-1.5">Reserved Seats:</p>
              <div className="flex flex-wrap gap-1.5">
                {seats.map((s) => (
                  <span
                    key={s.seatNumber}
                    className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30"
                  >
                    {s.seatNumber} ({s.tier?.toUpperCase()})
                  </span>
                ))}
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="pt-3 border-t border-gray-800/80 space-y-2 text-xs">
              <div className="flex justify-between text-gray-300">
                <span>Tickets Subtotal ({seats.length} seats)</span>
                <span className="font-mono">₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Convenience Fee</span>
                <span className="font-mono">₹{convenienceFee}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Integrated GST (18%)</span>
                <span className="font-mono">₹{tax}</span>
              </div>
              <div className="pt-2 border-t border-gray-800 flex justify-between text-sm font-bold text-white">
                <span>Grand Total</span>
                <span className="text-base text-amber-400 font-mono">₹{grandTotal}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Simulated Payment Form (7 cols) */}
        <div className="lg:col-span-7">
          <div className="p-6 sm:p-8 rounded-2xl bg-[#121826] border border-gray-800 space-y-6 shadow-2xl">
            {/* Prominent Simulated Payment Banner */}
            <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/40 text-blue-200 space-y-1">
              <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Simulated Payment Sandbox</span>
              </div>
              <p className="text-xs leading-relaxed text-blue-200/90">
                This is a mock checkout flow for interview evaluation. <strong>No real money will be charged</strong> and no real bank details are requested.
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-950/60 border border-red-500 text-red-200 flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold">Checkout Error</p>
                  <p className="mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Payment Method Selector */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Select Simulated Payment Method
              </label>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'SIMULATED_CARD', label: 'Credit Card', icon: CreditCard },
                  { id: 'SIMULATED_UPI', label: 'UPI / QR', icon: ShieldCheck },
                  { id: 'SIMULATED_NETBANKING', label: 'Net Banking', icon: Lock },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                        paymentMethod === m.id
                          ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold'
                          : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      <Icon className="w-5 h-5 mb-1" />
                      <span className="text-xs">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Simulated Card Form */}
            <form onSubmit={handleSimulatePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Simulated Card Number
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white font-mono outline-none"
                  placeholder="4111 •••• •••• 1111"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Valid Thru (MM/YY)
                  </label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white font-mono outline-none"
                    placeholder="12/28"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    CVV / CVC
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm text-white font-mono outline-none"
                    placeholder="•••"
                    required
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={processing}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold py-3.5 rounded-xl shadow-xl hover:shadow-amber-500/25 transition-all text-sm disabled:opacity-60"
                >
                  {processing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing Simulated Payment & Locking Seats...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Simulate Payment & Confirm (₹{grandTotal})</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-gray-500 text-center flex items-center justify-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Simulated 256-bit SSL encryption. Concurrency verified.</span>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
