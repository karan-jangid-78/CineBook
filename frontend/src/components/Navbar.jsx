import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Film, Ticket, User as UserIcon, LogOut, Clock, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../context/BookingContext';

export default function Navbar() {
  const { user, isAuthenticated, logout, quickDemoLogin } = useAuth();
  const { activeReservation, remainingSeconds, isHoldingSeats } = useBooking();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleDemoLogin = async () => {
    await quickDemoLogin('user');
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-gray-800/80">
      {/* Reservation Active Countdown Banner */}
      {isHoldingSeats && (
        <div className="bg-gradient-to-r from-amber-600/90 via-amber-500 to-amber-600 text-black px-4 py-1.5 font-medium text-xs sm:text-sm flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-2 mx-auto">
            <Clock className="w-4 h-4 animate-spin" />
            <span>
              Seats held temporarily: <strong>{activeReservation.seats?.map((s) => s.seatNumber).join(', ')}</strong>
            </span>
            <span className="bg-black/80 text-amber-400 font-mono px-2 py-0.5 rounded font-bold">
              {formatTimer(remainingSeconds)}
            </span>
            <button
              onClick={() => navigate('/checkout')}
              className="ml-3 underline hover:text-white transition font-semibold"
            >
              Resume Checkout &rarr;
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-200">
              <Film className="w-5 h-5 text-black" />
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black tracking-wider bg-gradient-to-r from-white via-gray-100 to-amber-400 bg-clip-text text-transparent font-display">
                CINE<span className="text-amber-500">BOOK</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] tracking-widest uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-semibold">
                Portfolio
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className="text-gray-300 hover:text-amber-400 transition-colors text-sm font-medium tracking-wide"
            >
              Movies
            </Link>
            {isAuthenticated && (
              <Link
                to="/my-bookings"
                className="flex items-center space-x-1.5 text-gray-300 hover:text-amber-400 transition-colors text-sm font-medium"
              >
                <Ticket className="w-4 h-4 text-amber-500" />
                <span>My Bookings</span>
              </Link>
            )}
          </nav>

          {/* Auth / Profile Actions */}
          <div className="flex items-center space-x-4">
            {!isAuthenticated ? (
              <div className="flex items-center space-x-2 sm:space-x-3">
                {/* 1-Click Quick Demo Login for Interviewers */}
                <button
                  onClick={handleDemoLogin}
                  title="Instant login with demo credentials"
                  className="hidden sm:flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/40 text-amber-400 hover:bg-amber-500 hover:text-black transition-all px-3 py-1.5 rounded-lg text-xs font-semibold"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Demo Login</span>
                </button>

                <Link
                  to="/login"
                  className="text-gray-300 hover:text-white px-3 py-1.5 text-xs sm:text-sm font-medium transition"
                >
                  Sign In
                </Link>

                <Link
                  to="/register"
                  className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-1.5 rounded-lg text-xs sm:text-sm shadow-md hover:shadow-amber-500/20 transition-all"
                >
                  Register
                </Link>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center space-x-2.5 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700 px-3 py-1.5 rounded-lg transition text-xs sm:text-sm"
                >
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="font-medium text-gray-200 hidden sm:inline">{user?.name}</span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#121826] border border-gray-700/80 shadow-2xl py-2 z-50 animate-fadeIn">
                    <div className="px-4 py-2 border-b border-gray-800">
                      <p className="text-xs text-gray-400">Signed in as</p>
                      <p className="text-sm font-semibold text-white truncate">{user?.email}</p>
                    </div>

                    <Link
                      to="/my-bookings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center space-x-2.5 px-4 py-2 text-xs sm:text-sm text-gray-300 hover:bg-amber-500/10 hover:text-amber-400 transition"
                    >
                      <Ticket className="w-4 h-4 text-amber-500" />
                      <span>My Bookings</span>
                    </Link>

                    <button
                      onClick={() => {
                        logout();
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-2.5 px-4 py-2 text-xs sm:text-sm text-red-400 hover:bg-red-500/10 transition text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
