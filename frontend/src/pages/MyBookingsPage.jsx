import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Ticket,
  Calendar,
  Clock,
  MapPin,
  Film,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function MyBookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past'

  useEffect(() => {
    async function fetchBookings() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get('/bookings/my-bookings');
        if (res.data.success) {
          setBookings(res.data.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch booking history');
      } finally {
        setLoading(false);
      }
    }
    fetchBookings();
  }, []);

  if (loading) return <LoadingSpinner message="Retrieving your cinema passes..." />;

  const now = new Date().getTime();
  const upcomingBookings = bookings.filter((b) => {
    const showTime = b.show?.startTime ? new Date(b.show.startTime).getTime() : 0;
    return showTime >= now;
  });

  const pastBookings = bookings.filter((b) => {
    const showTime = b.show?.startTime ? new Date(b.show.startTime).getTime() : 0;
    return showTime < now;
  });

  const displayedBookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

  const formatShowDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-gray-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            My Movie Bookings
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            View your confirmed tickets and admission passes for {user?.name}
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-[#121826] p-1 rounded-xl border border-gray-800 self-start">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'upcoming'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Upcoming Shows ({upcomingBookings.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'past'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Past History ({pastBookings.length})
          </button>
        </div>
      </div>

      {/* Bookings List */}
      {displayedBookings.length === 0 ? (
        <div className="p-12 text-center glass-card rounded-3xl max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <Ticket className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white">
            {activeTab === 'upcoming' ? 'No Upcoming Bookings' : 'No Past Bookings'}
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            {activeTab === 'upcoming'
              ? 'You do not have any upcoming movie shows scheduled. Explore trending movies and book seats now!'
              : 'You haven’t attended any shows yet.'}
          </p>
          <Link
            to="/"
            className="inline-flex items-center space-x-2 bg-amber-500 hover:bg-amber-400 text-black font-bold px-5 py-2.5 rounded-xl text-xs transition shadow-md"
          >
            <span>Explore Movies</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {displayedBookings.map((booking) => {
            const { show, seats, bookingReference, totalAmount, _id, status } = booking;
            return (
              <div
                key={_id}
                className="rounded-2xl bg-[#121826] border border-gray-800/80 hover:border-amber-500/40 p-5 sm:p-6 transition-all duration-300 shadow-xl flex flex-col md:flex-row gap-6 items-start md:items-center justify-between"
              >
                {/* Movie & Poster */}
                <div className="flex space-x-4 items-center">
                  <img
                    src={show?.movie?.posterUrl}
                    alt={show?.movie?.title}
                    className="w-16 h-24 object-cover rounded-xl border border-gray-700 bg-gray-900 flex-shrink-0"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                        {bookingReference}
                      </span>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {status}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white font-display line-clamp-1">
                      {show?.movie?.title}
                    </h3>

                    <p className="text-xs text-gray-400 flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <span>
                        {show?.cinema?.name} ({show?.screenName})
                      </span>
                    </p>

                    <div className="flex items-center space-x-3 text-xs text-gray-300 font-mono pt-0.5">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{formatShowDate(show?.startTime)}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{formatShowTime(show?.startTime)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Seats and Actions */}
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-gray-800 gap-3">
                  <div className="text-left md:text-right">
                    <p className="text-[11px] text-gray-400 font-medium">Seats:</p>
                    <p className="text-xs font-mono font-bold text-white">
                      {seats?.map((s) => s.seatNumber).join(', ')}
                    </p>
                    <p className="text-sm font-black text-amber-400 font-mono mt-0.5">
                      ₹{totalAmount}
                    </p>
                  </div>

                  <Link
                    to={`/confirmation/${_id}`}
                    state={{ booking }}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-gray-800 hover:bg-amber-500 hover:text-black text-white text-xs font-semibold rounded-xl transition shadow-md"
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    <span>View Pass &rarr;</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
