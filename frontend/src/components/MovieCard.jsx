import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock, Ticket } from 'lucide-react';

const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80';

export default function MovieCard({ movie }) {
  const [imageSrc, setImageSrc] = useState(movie.posterUrl || FALLBACK_POSTER);

  const formatDuration = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="group relative rounded-2xl overflow-hidden bg-cinema-card border border-cinema-border/50 hover:border-amber-500/50 transition-all duration-300 flex flex-col hover:-translate-y-1.5 shadow-lg hover:shadow-2xl hover:shadow-amber-500/10">
      {/* Poster Image */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-gray-900">
        <img
          src={imageSrc}
          alt={movie.title}
          onError={() => setImageSrc(FALLBACK_POSTER)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121826] via-transparent to-black/40 opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span className="flex items-center space-x-1 bg-black/75 backdrop-blur-md text-amber-400 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-500/30 shadow-md">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{movie.rating ? movie.rating.toFixed(1) : '8.5'}</span>
          </span>

          <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-gray-300 border border-white/10">
            {movie.certificate || 'UA'}
          </span>
        </div>

        {/* Duration bottom-right tag */}
        <div className="absolute bottom-3 right-3 flex items-center space-x-1 text-[11px] font-medium text-gray-300 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>{formatDuration(movie.duration || 150)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 justify-between bg-[#121826]">
        <div>
          {/* Genre Pills */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {movie.genre?.slice(0, 3).map((g) => (
              <span
                key={g}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700/60"
              >
                {g}
              </span>
            ))}
          </div>

          {/* Title */}
          <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1 font-sans">
            {movie.title}
          </h3>

          <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
            {movie.description}
          </p>
        </div>

        {/* CTA Button */}
        <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between">
          <span className="text-xs text-gray-400 font-medium">
            {movie.language || 'English'}
          </span>

          <Link
            to={`/movie/${movie._id}`}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black transition-all shadow-md group-hover:shadow-amber-500/20"
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Book Tickets</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
