import React from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { useBooking } from '../context/BookingContext';

export default function ReservationTimer() {
  const { remainingSeconds, isHoldingSeats } = useBooking();

  if (!isHoldingSeats) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  // 5 minutes total = 300 seconds
  const totalHoldSeconds = 300;
  const progressPercent = Math.min(100, Math.max(0, (remainingSeconds / totalHoldSeconds) * 100));

  const isUrgent = remainingSeconds < 60;
  const isWarning = remainingSeconds < 120 && !isUrgent;

  return (
    <div className={`p-4 rounded-xl border transition-all duration-300 ${
      isUrgent
        ? 'bg-red-950/40 border-red-500/60 text-red-200 shadow-lg shadow-red-900/30'
        : isWarning
        ? 'bg-orange-950/30 border-orange-500/50 text-orange-200'
        : 'bg-amber-950/20 border-amber-500/40 text-amber-200'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {isUrgent ? (
            <AlertTriangle className="w-5 h-5 text-red-400 animate-bounce" />
          ) : (
            <Clock className="w-5 h-5 text-amber-400 animate-spin" />
          )}
          <span className="text-xs sm:text-sm font-semibold tracking-wide">
            {isUrgent ? 'Hurry! Seats expiring soon' : 'Seats held temporarily for you'}
          </span>
        </div>

        <div className={`font-mono text-base sm:text-lg font-black tracking-wider ${
          isUrgent ? 'text-red-400 animate-pulse' : 'text-amber-400'
        }`}>
          {formattedTime}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-black/50 h-1.5 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            isUrgent ? 'bg-red-500' : isWarning ? 'bg-orange-500' : 'bg-amber-400'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <p className="text-[11px] text-gray-400 mt-2">
        To prevent hoarding, seats are released automatically if checkout isn't completed within 5 minutes.
      </p>
    </div>
  );
}
