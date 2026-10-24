import React from 'react';
import { Film, ShieldCheck, Zap, GitBranch, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-gray-800/80 bg-[#070A11] text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                <Film className="w-4 h-4 text-black" />
              </div>
              <span className="text-xl font-bold tracking-wider text-white font-display">
                CINE<span className="text-amber-500">BOOK</span>
              </span>
            </div>
            <p className="text-sm text-gray-400 max-w-md leading-relaxed">
              A high-concurrency movie ticket booking platform built with the MERN stack. Designed specifically to showcase database-enforced race condition prevention, multi-seat atomicity, and production-grade software engineering for placement interviews.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Concurrency-Safe (409 Conflict)</span>
              </span>
              <span className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Zap className="w-3.5 h-3.5" />
                <span>Atomic Holds & Rollback</span>
              </span>
              <span className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <GitBranch className="w-3.5 h-3.5" />
                <span>Idempotent Confirmation</span>
              </span>
            </div>
          </div>

          {/* Core Engineering Features */}
          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">Architecture</h4>
            <ul className="space-y-2 text-xs">
              <li className="hover:text-amber-400 transition">Partial Unique Indexes (HELD / CONFIRMED)</li>
              <li className="hover:text-amber-400 transition">All-or-Nothing Multi-Seat Atomicity</li>
              <li className="hover:text-amber-400 transition">5-Minute Dynamic Hold Expiration</li>
              <li className="hover:text-amber-400 transition">Delayed Cleanup Race Prevention</li>
              <li className="hover:text-amber-400 transition">Automated 100-Concurrent-Request Tests</li>
            </ul>
          </div>

          {/* Quick Demo Credentials */}
          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-4">Demo Credentials</h4>
            <div className="p-3 rounded-lg bg-gray-900/80 border border-gray-800 text-xs space-y-1.5 font-mono">
              <p className="text-gray-400">
                Email: <span className="text-amber-400">john@example.com</span>
              </p>
              <p className="text-gray-400">
                Pass: <span className="text-amber-400">password123</span>
              </p>
              <p className="text-[11px] text-gray-500 pt-1 font-sans">
                Admin: admin@cinebook.com / admin123
              </p>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500">
          <p>© 2026 CineBook — Engineered for Software Placement Interviews.</p>
          <p className="flex items-center space-x-1 mt-2 sm:mt-0">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
            <span>in Node.js, Express, MongoDB, & React</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
