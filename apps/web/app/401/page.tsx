"use client";

import Link from "next/link";
import { AlertOctagon, ShieldAlert, Home } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center overflow-hidden relative">
      
      {/* Background Animated Beams */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600 rounded-full mix-blend-screen filter blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-600 rounded-full mix-blend-screen filter blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-2xl">
        <div className="relative group">
          <ShieldAlert className="w-40 h-40 text-red-500 mb-8 animate-bounce" />
          <div className="absolute inset-0 bg-red-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 mb-6 tracking-tighter">
          401
        </h1>
        
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
          Whoa there, buddy.
        </h2>
        
        <p className="text-xl md:text-2xl text-slate-400 mb-12 font-medium">
          You just crossed the line into restricted territory. You don't have the clearance for this sector. Turn back before the alarms go off.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Link 
            href="/"
            className="flex items-center justify-center gap-2 px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(220,38,38,0.5)]"
          >
            <Home className="w-5 h-5" />
            Evacuate to Homepage
          </Link>
          <button 
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-transparent border-2 border-red-500/30 hover:border-red-500 text-red-400 hover:text-red-300 font-bold rounded-full transition-all hover:scale-105 active:scale-95"
          >
            Retreat
          </button>
        </div>
      </div>
    </div>
  );
}
