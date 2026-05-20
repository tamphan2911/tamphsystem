"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Link from "next/link";

interface GsapHoverButtonProps {
  href?: string;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "outline";
  onClick?: () => void;
}

gsap.registerPlugin(useGSAP);

export function GsapHoverButton({ href, children, className = "", variant = "primary", onClick }: GsapHoverButtonProps) {
  const buttonRef = useRef<any>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  useGSAP(() => {
    const q = gsap.utils.selector(buttonRef);
    
    tl.current = gsap.timeline({ paused: true })
      .to(q(".btn-bg"), {
        scale: 1,
        opacity: 1,
        duration: 0.4,
        ease: "power2.out"
      })
      .to(q(".btn-text"), {
        scale: 1.05,
        duration: 0.4,
        ease: "back.out(1.7)"
      }, "<");
  }, { scope: buttonRef });

  const handleMouseEnter = () => tl.current?.play();
  const handleMouseLeave = () => tl.current?.reverse();

  const baseStyles = "relative overflow-hidden flex items-center justify-center rounded-full font-bold transition-all px-8 py-4 cursor-pointer";
  const variants = {
    primary: "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl",
    outline: "bg-transparent border-2 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
  };

  const bgVariant = variant === 'primary' 
    ? "bg-blue-600 dark:bg-blue-500" 
    : "bg-slate-100 dark:bg-slate-800";

  const innerContent = (
    <>
      <div 
        className={`btn-bg absolute w-full h-full rounded-full opacity-0 pointer-events-none ${bgVariant}`}
        style={{ scale: 0.2 }}
      />
      <div className="btn-text relative z-10 flex items-center gap-2">
        {children}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href}>
        <div 
          ref={buttonRef}
          className={`${baseStyles} ${variants[variant]} ${className}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {innerContent}
        </div>
      </Link>
    );
  }

  return (
    <button 
      ref={buttonRef}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {innerContent}
    </button>
  );
}
