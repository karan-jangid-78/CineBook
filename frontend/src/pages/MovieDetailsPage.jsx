import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Star,
  Clock,
  Calendar,
  MapPin,
  Film,
  Play,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80';

function getLocalDateKey(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function MovieDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [movie, setMovie] = useState(null);
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);

  // Generate 5 consecutive dates in user's local timezone (Today, Tomorrow, Day 3, 4, 5)
  const availableDates = [0, 1, 2, 3, 4].map((offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return {
      date: d,
      dateKey: getLocalDateKey(d),
      dayName: offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      formattedDate: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
    };
  });

  const fetchMovieDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/movies/${id}`);
      if (res.data.success) {
        setMovie(res.data.data.movie);
        setShows(res.data.data.shows || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load movie details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovieDetails();
  }, [id]);

  if (loading) return <LoadingSpinner message="Loading movie details and showtimes..." />;

  if (error || !movie) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 glass-card rounded-2xl text-center">
        <Film className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-2">Movie Not Found</h3>
        <p className="text-xs text-gray-400 mb-4">{error || 'Unable to locate movie'}</p>
        <Link to="/" className="inline-block px-4 py-2 bg-amber-500 text-black text-xs font-bold rounded-lg">
          Back to Home
        </Link>
      </div>
    );
  }

  // Filter shows by selected local date
  const selectedDateKey = availableDates[selectedDateIndex]?.dateKey;
  const filteredShows = shows.filter((s) => {
    return getLocalDateKey(s.startTime) === selectedDateKey;
  });

  // Group shows by Cinema
  const cinemaGroups = filteredShows.reduce((acc, show) => {
    const cinemaId = show.cinema?._id || 'unknown';
    if (!acc[cinemaId]) {
      acc[cinemaId] = {
        cinema: show.cinema,
        shows: [],
      };
    }
    acc[cinemaId].shows.push(show);
    return acc;
  }, {});

  const formatShowTime = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const isUpcomingRelease = movie.status === 'upcoming';
  const nowTime = Date.now();

  return (
    <div className="min-h-screen pb-16">
      {/* Backdrop Header */}
      <div className="relative w-full h-[320px] sm:h-[420px] overflow-hidden">
        <img
          src={movie.backdropUrl || movie.posterUrl}
          alt={movie.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F19] via-[#0B0F19]/60 to-transparent" />

        <div className="absolute top-4 left-4 sm:left-8 z-10">
          <Link
            to="/"
            className="inline-flex items-center space-x-1.5 text-xs text-gray-300 hover:text-white bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Movies</span>
          </Link>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 sm:-mt-32 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Poster Column */}
          <div className="md:col-span-1">
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-800 bg-gray-900 aspect-[2/3] sticky top-24">
              <img
                src={movie.posterUrl || FALLBACK_POSTER}
                alt={movie.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Details & Showtimes Column */}
          <div className="md:col-span-3 space-y-8">
            {/* Movie Info Header */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {movie.genre?.map((g) => (
                  <span
                    key={g}
                    className="text-xs font-medium px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  >
                    {g}
                  </span>
                ))}
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                  {movie.certificate || 'UA'}
                </span>
                {isUpcomingRelease && (
                  <span className="text-xs font-bold px-3 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Releasing Soon
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
                {movie.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-300">
                <span className="flex items-center space-x-1 text-amber-400 font-bold bg-black/60 px-2.5 py-1 rounded-md border border-amber-500/30">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>{movie.rating ? movie.rating.toFixed(1) : '8.8'} / 10</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{movie.duration} Minutes</span>
                </span>
                <span>•</span>
                <span>{movie.language || 'English'}</span>
              </div>

              <p className="text-sm text-gray-300 leading-relaxed max-w-3xl">
                {movie.description}
              </p>

              {movie.director && (
                <div className="text-xs text-gray-400">
                  <strong className="text-gray-200">Director:</strong> {movie.director}
                </div>
              )}

              {movie.cast && movie.cast.length > 0 && (
                <div className="text-xs text-gray-400">
                  <strong className="text-gray-200">Starring:</strong> {movie.cast.join(', ')}
                </div>
              )}
            </div>

            {/* Showtime Selection Section */}
            <div className="pt-6 border-t border-gray-800 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-wide font-display">
                    {isUpcomingRelease ? 'Theatrical Release Schedule' : 'Select Cinema & Showtime'}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {isUpcomingRelease
                      ? 'Advance ticket booking status and premiere details'
                      : 'Choose your preferred date, theater format, and seat experience'}
                  </p>
                </div>

                {!isUpcomingRelease && (
                  <div className="hidden sm:flex items-center space-x-1 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Real-time seat locks enabled</span>
                  </div>
                )}
              </div>

              {isUpcomingRelease ? (
                /* Upcoming Release Callout Banner */
                <div className="p-8 text-center glass-card rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-500/10 to-transparent">
                  <Calendar className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-white mb-2">Advance Booking Opening Soon</h3>
                  <p className="text-xs text-gray-300 max-w-md mx-auto mb-4 leading-relaxed">
                    <strong className="text-amber-400">{movie.title}</strong> is scheduled for upcoming release. Full showtime schedules and advance reservations will open across CineBook theaters shortly.
                  </p>
                  <div className="inline-flex items-center space-x-2 text-xs text-purple-300 bg-black/60 px-4 py-2 rounded-xl border border-purple-500/30">
                    <Clock className="w-4 h-4" />
                    <span>Check back closer to release or browse Now Showing movies</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Date Selection Pills */}
                  <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-none">
                    {availableDates.map((item, idx) => (
                      <button
                        key={item.dateKey}
                        onClick={() => setSelectedDateIndex(idx)}
                        className={`flex flex-col items-center justify-center min-w-[90px] py-2.5 px-4 rounded-xl border transition-all ${
                          selectedDateIndex === idx
                            ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-lg shadow-amber-500/20 scale-105'
                            : 'bg-[#121826] text-gray-300 border-gray-800 hover:border-gray-700'
                        }`}
                      >
                        <span className="text-[11px] uppercase tracking-wider font-semibold">
                          {item.dayName}
                        </span>
                        <span className="text-sm font-extrabold mt-0.5">{item.formattedDate}</span>
                      </button>
                    ))}
                  </div>

                  {/* Cinema & Shows Listings */}
                  {Object.keys(cinemaGroups).length === 0 ? (
                    <div className="p-8 text-center glass-card rounded-2xl space-y-4">
                      <Calendar className="w-10 h-10 text-gray-600 mx-auto" />
                      <div>
                        <p className="text-sm text-gray-200 font-semibold">
                          {selectedDateIndex === 0
                            ? "All shows for today have concluded."
                            : "No shows scheduled for this selected date."}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedDateIndex === 0
                            ? "Browse tomorrow's schedule or pick another date above."
                            : "Please select another date above to view available showtimes."}
                        </p>
                      </div>
                      {selectedDateIndex === 0 && availableDates.length > 1 && (
                        <button
                          onClick={() => setSelectedDateIndex(1)}
                          className="px-4 py-2 bg-amber-500 text-black text-xs font-bold rounded-xl hover:bg-amber-400 transition"
                        >
                          View Tomorrow's Shows →
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.values(cinemaGroups).map(({ cinema, shows: cinemaShows }) => (
                        <div
                          key={cinema?._id || Math.random()}
                          className="p-5 rounded-2xl bg-[#121826] border border-gray-800/80 space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div>
                              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                                <span>{cinema?.name}</span>
                              </h3>
                              <p className="text-xs text-gray-400 flex items-center space-x-1 mt-0.5">
                                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                                <span>
                                  {cinema?.location}, {cinema?.city}
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Show Timing Buttons */}
                          <div className="flex flex-wrap gap-3 pt-2">
                            {cinemaShows.map((show) => {
                              const showTimeMs = new Date(show.startTime).getTime();
                              const isPast = showTimeMs < nowTime;

                              if (isPast) {
                                return (
                                  <div
                                    key={show._id}
                                    className="flex flex-col items-center px-4 py-2.5 rounded-xl bg-gray-900/50 border border-gray-800/60 opacity-40 cursor-not-allowed text-left"
                                  >
                                    <span className="text-xs font-bold text-gray-400 font-mono line-through">
                                      {formatShowTime(show.startTime)}
                                    </span>
                                    <span className="text-[10px] text-gray-500 font-semibold uppercase mt-0.5">
                                      Show Ended
                                    </span>
                                    <span className="text-[9px] text-gray-600 mt-0.5">
                                      {show.format || '2D'}
                                    </span>
                                  </div>
                                );
                              }

                              return (
                                <button
                                  key={show._id}
                                  onClick={() => navigate(`/booking/seats/${show._id}`)}
                                  className="group relative flex flex-col items-center px-4 py-2.5 rounded-xl bg-gray-800/70 hover:bg-amber-500 border border-gray-700 hover:border-amber-400 text-left transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/20"
                                >
                                  <span className="text-xs font-bold text-gray-100 group-hover:text-black transition-colors font-mono">
                                    {formatShowTime(show.startTime)}
                                  </span>
                                  <span className="text-[10px] text-amber-400 group-hover:text-black font-semibold uppercase mt-0.5 transition-colors">
                                    {show.format || '2D'} • {show.screenName?.split('-')[0] || 'Audi 1'}
                                  </span>
                                  <span className="text-[9px] text-gray-400 group-hover:text-black/80 transition-colors mt-0.5">
                                    Starts at ₹{show.pricing?.standard || 220}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
