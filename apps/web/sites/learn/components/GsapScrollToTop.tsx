"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { ArrowUp } from "lucide-react";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollToPlugin, useGSAP);

export function GsapScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const mainContent = document.getElementById("learn-main-content");
      if (mainContent) {
        setIsVisible(mainContent.scrollTop > 200);
      } else {
        setIsVisible(window.scrollY > 200);
      }
    };

    const mainContent = document.getElementById("learn-main-content");
    const target = mainContent || window;

    target.addEventListener("scroll", handleScroll);
    return () => target.removeEventListener("scroll", handleScroll);
  }, []);

  useGSAP(() => {
    if (isVisible) {
      gsap.to(btnRef.current, {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.4,
        ease: "back.out(1.7)",
        display: "block",
      });
    } else {
      gsap.to(btnRef.current, {
        y: 20,
        opacity: 0,
        scale: 0.8,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          if (btnRef.current) btnRef.current.style.display = "none";
        },
      });
    }
  }, [isVisible]);

  const scrollToTop = () => {
    const mainContent = document.getElementById("learn-main-content");
    if (mainContent) {
      gsap.to(mainContent, { duration: 1, scrollTo: 0, ease: "power3.inOut" });
    } else {
      gsap.to(window, { duration: 1, scrollTo: 0, ease: "power3.inOut" });
    }
  };

  return (
    <button
      ref={btnRef}
      onClick={scrollToTop}
      className="fixed bottom-10 right-10 p-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full shadow-2xl z-50 hidden hover:scale-110 active:scale-95 transition-transform"
      aria-label="Scroll to top"
    >
      <ArrowUp className="w-6 h-6" />
    </button>
  );
}
