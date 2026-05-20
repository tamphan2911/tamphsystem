"use client";

import Link from "next/link";
import { Ghost, Home, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center overflow-hidden relative">
      
      {/* Background Animated Beams */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/3 left-1/3 w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-[100px] animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-2xl">
        <div className="relative group animate-[spin_10s_linear_infinite]">
          <SearchX className="w-40 h-40 text-purple-500 mb-8" />
          <div className="absolute inset-0 bg-purple-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500 mb-6 tracking-tighter">
          404
        </h1>
        
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
          Lost in the void.
        </h2>
        
        <p className="text-xl md:text-2xl text-slate-400 mb-12 font-medium">
          Whatever you were looking for doesn't exist here. It might have been deleted, moved, or it was just a figment of your imagination.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Link 
            href="/"
            className="flex items-center justify-center gap-2 px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(147,51,234,0.5)]"
          >
            <Home className="w-5 h-5" />
            Return to Reality
          </Link>
        </div>
      </div>
    </div>
  );
}
