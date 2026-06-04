"use client";

import { useEffect, useState } from "react";

const PHRASES = [
  "Python for data analysis",
  "Academic writing bootcamp",
  "Finance with Excel",
  "Research methods",
  "Web development fundamentals",
];

const TYPING_SPEED = 100;
const DELETING_SPEED = 50;
const PAUSE_DURATION = 2000;

export function TypingEffect() {
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);

  useEffect(() => {
    const currentPhrase = PHRASES[loopNum % PHRASES.length] || "";
    const delay =
      !isDeleting && text === currentPhrase
        ? PAUSE_DURATION
        : isDeleting
          ? DELETING_SPEED
          : TYPING_SPEED;
    const timeoutId = setTimeout(() => {
      if (!isDeleting && text === currentPhrase) {
        setIsDeleting(true);
      } else if (isDeleting && text === "") {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
      } else if (isDeleting) {
        setText(currentPhrase.substring(0, text.length - 1));
      } else {
        setText(currentPhrase.substring(0, text.length + 1));
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [text, isDeleting, loopNum]);

  return (
    <span className="animate-[blink_1s_step-end_infinite] border-r-2 border-slate-950 pr-1 font-semibold text-slate-950 dark:border-white dark:text-white">
      {text}
    </span>
  );
}
