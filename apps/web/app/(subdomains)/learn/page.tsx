import { HeroSearchBox } from "../../../components/HeroSearchBox";
import { TypingEffect } from "../../../components/TypingEffect";

export default function LearnLandingPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 dark:bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 text-center z-10 w-full mt-[-10vh]">
        
        {/* Main Headline */}
        <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6">
          What do you want to <br className="hidden md:block" /> learn today?
        </h1>
        
        {/* Subtitle with Typing Effect */}
        <div className="h-12 mb-10 text-xl md:text-2xl text-slate-600 dark:text-slate-400 font-medium">
          Explore courses in <TypingEffect />
        </div>

        {/* Floating Search Box */}
        <HeroSearchBox />

        {/* Trust Signals below search box */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-slate-500 dark:text-slate-400 font-medium">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Over 2,000+ Courses
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Expert Instructors
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Enterprise Grade
          </div>
        </div>
      </div>
    </div>
  );
}
