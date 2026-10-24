import React from 'react';
import { Film } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading cinema experience...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <div className="relative w-14 h-14">
        {/* Outer Rotating Ring */}
        <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
        {/* Inner Film Reel Icon */}
        <div className="absolute inset-0 flex items-center justify-center text-amber-500">
          <Film className="w-6 h-6 animate-pulse" />
        </div>
      </div>
      <p className="text-sm text-gray-400 font-medium tracking-wide animate-pulse">{message}</p>
    </div>
  );
}
