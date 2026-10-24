import React from 'react';
import { Check, ShieldAlert } from 'lucide-react';

export default function SeatMap({
  seats = [],
  selectedSeats = [],
  onToggleSeat,
  pricing = { standard: 220, premium: 350, vip: 520 },
}) {
  // Group seats by rows
  const rows = ['F', 'E', 'D', 'C', 'B', 'A']; // VIP at top, Standard near screen

  const getTierLabel = (row) => {
    if (['E', 'F'].includes(row)) return { name: 'VIP Recliner', price: pricing.vip || 520, color: 'text-purple-400' };
    if (['C', 'D'].includes(row)) return { name: 'Premium Club', price: pricing.premium || 350, color: 'text-amber-400' };
    return { name: 'Standard Classic', price: pricing.standard || 220, color: 'text-blue-400' };
  };

  const getSeatData = (seatNum) => {
    return seats.find((s) => s.seatNumber === seatNum) || {
      seatNumber: seatNum,
      status: 'available',
      price: 220,
    };
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      {/* Screen Representation */}
      <div className="w-full max-w-2xl mb-12 text-center">
        <div className="screen-curve w-full" />
        <p className="text-xs tracking-[0.3em] uppercase text-gray-500 mt-3 font-semibold">
          All eyes this way — Cinema Screen
        </p>
      </div>

      {/* Seat Grid by Tier */}
      <div className="w-full space-y-6">
        {rows.map((row, index) => {
          const tier = getTierLabel(row);
          const showTierHeader = index === 0 || rows[index - 1] && getTierLabel(rows[index - 1]).name !== tier.name;

          return (
            <div key={row} className="space-y-2">
              {showTierHeader && (
                <div className="flex items-center justify-between border-b border-gray-800/80 pb-1.5 px-2">
                  <span className={`text-xs font-semibold tracking-wider uppercase ${tier.color}`}>
                    {tier.name}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    ₹{tier.price} / ticket
                  </span>
                </div>
              )}

              <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                {/* Row Letter Left */}
                <span className="w-5 text-center text-xs font-bold text-gray-500 font-mono">
                  {row}
                </span>

                {/* Left Aisle (Seats 1-5) */}
                <div className="flex space-x-1.5 sm:space-x-2">
                  {[1, 2, 3, 4, 5].map((col) => {
                    const seatNum = `${row}${col}`;
                    const seat = getSeatData(seatNum);
                    const isSelected = selectedSeats.includes(seatNum);

                    return (
                      <SeatButton
                        key={seatNum}
                        seat={seat}
                        isSelected={isSelected}
                        onClick={() => onToggleSeat(seatNum, seat)}
                      />
                    );
                  })}
                </div>

                {/* Central Aisle Gap */}
                <div className="w-4 sm:w-8" />

                {/* Right Aisle (Seats 6-10) */}
                <div className="flex space-x-1.5 sm:space-x-2">
                  {[6, 7, 8, 9, 10].map((col) => {
                    const seatNum = `${row}${col}`;
                    const seat = getSeatData(seatNum);
                    const isSelected = selectedSeats.includes(seatNum);

                    return (
                      <SeatButton
                        key={seatNum}
                        seat={seat}
                        isSelected={isSelected}
                        onClick={() => onToggleSeat(seatNum, seat)}
                      />
                    );
                  })}
                </div>

                {/* Row Letter Right */}
                <span className="w-5 text-center text-xs font-bold text-gray-500 font-mono">
                  {row}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-12 w-full pt-6 border-t border-gray-800 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs text-gray-300">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-md bg-cinema-seatAvailable border border-gray-700/80" />
          <span>Available</span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-md bg-amber-500 text-black flex items-center justify-center font-bold">
            <Check className="w-3 h-3" />
          </div>
          <span>Selected</span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-md bg-orange-600/90 border border-orange-500 flex items-center justify-center">
            <span className="text-[10px] text-white">⏳</span>
          </div>
          <span>Held (Temporary)</span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-md bg-gray-800 border border-gray-700/50 opacity-40 cursor-not-allowed" />
          <span>Sold Out</span>
        </div>
      </div>
    </div>
  );
}

function SeatButton({ seat, isSelected, onClick }) {
  const isAvailable = seat.status === 'available';
  const isHeld = seat.status === 'held' && !seat.heldByCurrentUser;
  const isBooked = seat.status === 'booked';
  const isHeldByMe = seat.status === 'held' && seat.heldByCurrentUser;

  let buttonClasses = 'w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-[10px] sm:text-xs font-semibold flex items-center justify-center transition-all duration-200 relative select-none ';

  if (isSelected || isHeldByMe) {
    buttonClasses += 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/40 scale-105 ring-2 ring-amber-300';
  } else if (isAvailable) {
    buttonClasses += 'bg-slate-800/90 text-gray-300 border border-slate-700 hover:border-amber-400 hover:text-amber-400 hover:scale-105 active:scale-95 cursor-pointer';
  } else if (isHeld) {
    buttonClasses += 'bg-orange-950/70 text-orange-400 border border-orange-700/60 cursor-not-allowed opacity-85';
  } else if (isBooked) {
    buttonClasses += 'bg-gray-900/80 text-gray-600 border border-gray-800 cursor-not-allowed opacity-40';
  }

  const tooltip = isBooked
    ? `${seat.seatNumber}: Sold Out`
    : isHeld
    ? `${seat.seatNumber}: Held by another user`
    : `${seat.seatNumber} (₹${seat.price})`;

  return (
    <button
      type="button"
      title={tooltip}
      disabled={isBooked || isHeld}
      onClick={onClick}
      className={buttonClasses}
    >
      {isSelected || isHeldByMe ? (
        <Check className="w-3.5 h-3.5 stroke-[3]" />
      ) : isHeld ? (
        <span className="text-[9px]">⏳</span>
      ) : (
        seat.col
      )}
    </button>
  );
}
