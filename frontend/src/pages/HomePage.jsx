import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Film, Star, Play, Sparkles, Filter, Ticket } from 'lucide-react';
import api from '../services/api';
import MovieCard from '../components/MovieCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function HomePage() {
  const [movies, setMovies] = useState([]);
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('now_showing');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchMovies() {
      try {
        setLoading(true);
        setError(null);
        const params = { status: statusFilter };
        if (selectedGenre !== 'All') params.genre = selectedGenre;
        if (searchQuery.trim()) params.search = searchQuery.trim();

        const res = await api.get('/movies', { params });
        if (res.data.success) {
          setMovies(res.data.data);
          if (res.data.genres) {
            setGenres(['All', ...res.data.genres]);
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load movies. Is the backend running?');
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      fetchMovies();
    }, 200);

    return () => clearTimeout(timer);
  }, [selectedGenre, searchQuery, statusFilter]);

  const featuredMovie = movies.find((m) => m.featured) || movies[0];

  return (
    <div className="min-h-screen">
      {/* Featured Spotlight Hero Banner */}
      {featuredMovie && (
        <section className="relative w-full h-[450px] sm:h-[550px] lg:h-[620px] overflow-hidden">
          {/* Background Image with Cinematic Overlay */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 scale-105"
            style={{
              backgroundImage: `url(${featuredMovie.backdropUrl || featuredMovie.posterUrl})`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F19] via-[#0B0F19]/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-transparent to-[#0B0F19]/40" />
          </div>

          <div className="relative max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center">
            <div className="max-w-2xl space-y-4 sm:space-y-6">
              <div className="inline-flex items-center space-x-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Featured Spotlight Blockbuster</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight font-display">
                {featuredMovie.title}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-300">
                <span className="flex items-center space-x-1 text-amber-400 font-bold bg-black/50 px-2.5 py-1 rounded-md border border-amber-500/30">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>{featuredMovie.rating?.toFixed(1) || '8.8'}</span>
                </span>
                <span>•</span>
                <span>{featuredMovie.genre?.join(', ')}</span>
                <span>•</span>
                <span>{featuredMovie.duration} mins</span>
                <span>•</span>
                <span className="px-2 py-0.5 rounded bg-gray-800 border border-gray-700 font-semibold text-xs">
                  {featuredMovie.certificate || 'UA'}
                </span>
              </div>

              <p className="text-gray-300 text-sm sm:text-base line-clamp-3 leading-relaxed max-w-xl">
                {featuredMovie.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to={`/movie/${featuredMovie._id}`}
                  className="inline-flex items-center space-x-2 bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-3 rounded-xl shadow-lg hover:shadow-amber-500/30 hover:scale-105 transition-all text-sm"
                >
                  <Ticket className="w-4 h-4" />
                  <span>Book Tickets Now</span>
                </Link>

                {featuredMovie.trailerUrl && (
                  <a
                    href={featuredMovie.trailerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 bg-gray-800/80 hover:bg-gray-700/80 text-white font-medium px-5 py-3 rounded-xl border border-gray-700 backdrop-blur-md transition text-sm"
                  >
                    <Play className="w-4 h-4 text-amber-400" />
                    <span>Watch Trailer</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Browse Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Filter and Search Bar Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          {/* Status Tabs: Now Showing vs Upcoming */}
          <div className="flex bg-[#121826] p-1 rounded-xl border border-gray-800 self-start">
            <button
              onClick={() => setStatusFilter('now_showing')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
                statusFilter === 'now_showing'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Now Showing
            </button>
            <button
              onClick={() => setStatusFilter('upcoming')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
                statusFilter === 'upcoming'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Coming Soon
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by movie title..."
              className="w-full bg-[#121826] border border-gray-800 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 outline-none transition"
            />
          </div>
        </div>

        {/* Genre Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
          {genres.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedGenre === genre
                  ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
                  : 'bg-[#121826] text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-800'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Movie Listings Grid */}
        {loading ? (
          <LoadingSpinner message="Fetching cinema listings..." />
        ) : error ? (
          <div className="p-8 text-center glass-card rounded-2xl max-w-lg mx-auto">
            <Film className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-2">Connection Notice</h3>
            <p className="text-xs text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-amber-500 text-black text-xs font-semibold rounded-lg hover:bg-amber-400 transition"
            >
              Retry Connection
            </button>
          </div>
        ) : movies.length === 0 ? (
          <div className="p-12 text-center glass-card rounded-2xl max-w-md mx-auto">
            <Film className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No movies found</h3>
            <p className="text-xs text-gray-400">
              No titles match your filter "{selectedGenre}" or search term "{searchQuery}".
            </p>
            <button
              onClick={() => {
                setSelectedGenre('All');
                setSearchQuery('');
              }}
              className="mt-4 px-3 py-1.5 bg-gray-800 text-xs font-semibold text-amber-400 rounded-lg hover:bg-gray-700 transition"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {movies.map((movie) => (
              <MovieCard key={movie._id} movie={movie} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
