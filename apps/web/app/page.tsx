"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Code, GraduationCap, Briefcase, ChevronRight, TrendingUp, Cpu } from "lucide-react";
import { ThemeToggle } from "../components/ThemeToggle";
import { GsapHoverButton } from "../components/GsapHoverButton";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useRef } from "react";

gsap.registerPlugin(useGSAP);

export default function PersonalPortfolio() {
  const sliderRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Infinite horizontal slider
    if (sliderRef.current) {
      gsap.to(sliderRef.current, {
        xPercent: -50, // Move left by 50% of the total width
        ease: "none",
        duration: 30,  // Adjust speed here
        repeat: -1,    // Infinite repeat
      });
    }
  }, { scope: sliderRef });

  const services = [
    { icon: BookOpen, title: "Research Consulting", desc: "Guiding research methodology, data analysis, and publication strategies in Business, Finance, and Banking.", color: "blue" },
    { icon: Code, title: "Fintech Solutions", desc: "Architecting and building modern fintech applications, quantitative models, and secure enterprise systems.", color: "emerald" },
    { icon: GraduationCap, title: "Academic Infrastructure", desc: "Developing custom Learning Management Systems, test banks, and interactive educational tools for institutions.", color: "purple" },
    { icon: TrendingUp, title: "Quantitative Analytics", desc: "Building high-performance data pipelines and statistical models for market research and financial predictions.", color: "orange" },
    { icon: Cpu, title: "AI Integration", desc: "Implementing generative AI workflows into academic research pipelines and enterprise software products.", color: "pink" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-blue-500/30">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">
            TAMPH<span className="text-blue-600">.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#about" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">About</a>
            <a href="#research" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Research</a>
            <a href="#services" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Services</a>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-semibold tracking-wide">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            University Lecturer & Researcher
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight">
            Bridging the gap between <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Finance</span> and <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">Code.</span>
          </h1>
          
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            I'm Tamph, exploring the intersections of Banking, Fintech, and Software Engineering. I build educational platforms, conduct academic research, and solve complex business problems.
          </p>
          
          <div className="flex flex-wrap items-center gap-4">
            <GsapHoverButton href="https://learn.tamph.com" variant="primary">
              Join My Courses <ArrowRight className="w-5 h-5" />
            </GsapHoverButton>
            <GsapHoverButton href="https://research.tamph.com" variant="outline">
              Read Research
            </GsapHoverButton>
          </div>
        </div>

        {/* Hero Visual */}
        <div className="flex-1 relative w-full max-w-lg aspect-square">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-emerald-500/20 rounded-[3rem] rotate-3 filter blur-xl animate-pulse"></div>
          <div className="absolute inset-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="h-12 border-b border-slate-100 dark:border-slate-800 flex items-center px-6 gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            </div>
            <div className="flex-1 p-8 bg-[#1e1e1e] font-mono text-sm sm:text-base text-emerald-400">
              <p><span className="text-pink-500">class</span> <span className="text-blue-400">Tamph</span>:</p>
              <p className="pl-4"><span className="text-pink-500">def</span> <span className="text-yellow-200">__init__</span>(self):</p>
              <p className="pl-8">self.roles = [<span className="text-orange-300">"Lecturer"</span>, <span className="text-orange-300">"Researcher"</span>]</p>
              <p className="pl-8">self.fields = [<span className="text-orange-300">"Finance"</span>, <span className="text-orange-300">"Fintech"</span>]</p>
              <br/>
              <p className="pl-4"><span className="text-pink-500">def</span> <span className="text-yellow-200">innovate</span>(self):</p>
              <p className="pl-8"><span className="text-pink-500">while</span> <span className="text-purple-400">True</span>:</p>
              <p className="pl-12">self.build_systems()</p>
              <p className="pl-12">self.publish_papers()</p>
            </div>
          </div>
        </div>
      </main>

      {/* Services Section - Infinite Slider */}
      <section id="services" className="py-24 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 mb-16">
          <div className="text-center">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Academic & Industry Solutions</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Leveraging deep expertise in both academia and software engineering to provide specialized consulting services.
            </p>
          </div>
        </div>

        {/* The Slider Container */}
        <div className="relative w-full overflow-hidden pb-12 cursor-grab active:cursor-grabbing">
          {/* Gradient Masks for smooth fading on edges */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white dark:from-slate-900 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white dark:from-slate-900 to-transparent z-10 pointer-events-none" />
          
          <div ref={sliderRef} className="flex gap-8 w-max pl-8">
            {/* Render two sets of cards to create the infinite loop illusion */}
            {[...services, ...services].map((service, index) => {
              const Icon = service.icon;
              return (
                <div key={index} className="w-[350px] flex-shrink-0 p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
                  <div className={`w-14 h-14 rounded-2xl bg-${service.color}-100 dark:bg-${service.color}-900/50 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                    <Icon className={`w-7 h-7 text-${service.color}-600 dark:text-${service.color}-400`} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{service.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {service.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 text-center border-t border-slate-200 dark:border-slate-800">
        <p className="text-slate-500 dark:text-slate-400 font-medium">
          © {new Date().getFullYear()} Tamph. Designed for the Future of Learning.
        </p>
      </footer>
    </div>
  );
}
