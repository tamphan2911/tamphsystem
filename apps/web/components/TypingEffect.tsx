"use client";

import { useEffect, useState } from "react";

const PHRASES = [
  "Advanced Machine Learning",
  "Full-Stack Web Development",
  "Corporate Leadership",
  "Financial Modeling",
  "UI/UX Design Masterclass"
];

const TYPING_SPEED = 100;
const DELETING_SPEED = 50;
const PAUSE_DURATION = 2000;

export function TypingEffect() {
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(TYPING_SPEED);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const currentPhrase = PHRASES[loopNum % PHRASES.length] || "";

    if (isDeleting) {
      setText(currentPhrase.substring(0, text.length - 1));
      setTypingSpeed(DELETING_SPEED);
    } else {
      setText(currentPhrase.substring(0, text.length + 1));
      setTypingSpeed(TYPING_SPEED);
    }

    if (!isDeleting && text === currentPhrase) {
      // Pause at the end of typing
      timer = setTimeout(() => setIsDeleting(true), PAUSE_DURATION);
    } else if (isDeleting && text === "") {
      // Move to next phrase
      setIsDeleting(false);
      setLoopNum(loopNum + 1);
      timer = setTimeout(() => {}, 500); // Brief pause before typing next
    } else {
      // Continue typing/deleting
      timer = setTimeout(() => {}, typingSpeed);
    }

    // Workaround for useEffect cleanup using setTimeout
    const handleTick = () => {
      // Logic is handled in state updates above, but we need the timeout reference
    };
    
    // Proper timeout setup
    const timeoutId = setTimeout(() => {
      if (!isDeleting && text === currentPhrase) {
        setIsDeleting(true);
      } else if (isDeleting && text === "") {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
      } else if (isDeleting) {
        setText(currentPhrase.substring(0, text.length - 1));
        setTypingSpeed(DELETING_SPEED);
      } else {
        setText(currentPhrase.substring(0, text.length + 1));
        setTypingSpeed(TYPING_SPEED);
      }
    }, text === currentPhrase ? PAUSE_DURATION : typingSpeed);

    return () => clearTimeout(timeoutId);
  }, [text, isDeleting, loopNum, typingSpeed]);

  return (
    <span className="text-blue-600 dark:text-blue-400 font-semibold border-r-2 border-blue-600 dark:border-blue-400 pr-1 animate-[blink_1s_step-end_infinite]">
      {text}
    </span>
  );
}
