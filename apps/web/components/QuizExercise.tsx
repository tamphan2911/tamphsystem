"use client";

import { useState, type ReactNode } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

type Question = {
  id: string;
  text: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
};

export function QuizExercise({ 
  title = "Quiz", 
  questions = [
    {
      id: "q1",
      text: "What is the primary purpose of pandas in Python?",
      options: [
        { id: "o1", text: "Web Development" },
        { id: "o2", text: "Data Manipulation and Analysis" },
        { id: "o3", text: "Game Development" },
        { id: "o4", text: "Machine Learning Model Training" }
      ],
      correctOptionId: "o2"
    },
    {
      id: "q2",
      text: "Which of the following is immutable in Python?",
      options: [
        { id: "o1", text: "List" },
        { id: "o2", text: "Dictionary" },
        { id: "o3", text: "Set" },
        { id: "o4", text: "Tuple" }
      ],
      correctOptionId: "o4"
    }
  ]
}: { 
  title?: string;
  questions?: Question[];
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const handleSelect = (questionId: string, optionId: string) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = () => {
    let currentScore = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctOptionId) {
        currentScore++;
      }
    });
    setScore(currentScore);
    setIsSubmitted(true);
  };

  const handleRetry = () => {
    setAnswers({});
    setIsSubmitted(false);
    setScore(0);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{questions.length} questions to test your knowledge.</p>
        </div>
        {isSubmitted && (
          <div className={`px-6 py-2 rounded-full font-bold text-lg ${
            score === questions.length ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
            : score > 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}>
            Score: {score} / {questions.length}
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-10">
        {questions.map((q, idx) => (
          <div key={q.id}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              <span className="text-slate-400 mr-2">{idx + 1}.</span> {q.text}
            </h3>
            
            <div className="space-y-3">
              {q.options.map(opt => {
                const isSelected = answers[q.id] === opt.id;
                const isCorrect = opt.id === q.correctOptionId;
                
                // Determine styling based on state
                let cardClass = "border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer";
                let icon: ReactNode = null;

                if (isSelected) {
                  cardClass = "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500 cursor-pointer";
                }

                if (isSubmitted) {
                  cardClass = "border-slate-200 dark:border-slate-800 opacity-50 cursor-default"; // Default disabled
                  
                  if (isSelected && !isCorrect) {
                    cardClass = "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 cursor-default";
                    icon = <XCircle className="w-5 h-5 text-red-500" />;
                  } else if (isCorrect) {
                    cardClass = "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-medium cursor-default ring-1 ring-emerald-500";
                    icon = <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
                  }
                }

                return (
                  <div 
                    key={opt.id}
                    onClick={() => handleSelect(q.id, opt.id)}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 ${cardClass}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected && !isSubmitted ? "border-blue-500" 
                        : isSubmitted && isCorrect ? "border-emerald-500"
                        : isSubmitted && isSelected && !isCorrect ? "border-red-500"
                        : "border-slate-300 dark:border-slate-600"
                      }`}>
                        {isSelected && !isSubmitted && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                        {isSubmitted && isCorrect && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                        {isSubmitted && isSelected && !isCorrect && <div className="w-2.5 h-2.5 rounded-full bg-red-500" />}
                      </div>
                      <span className={`text-slate-700 dark:text-slate-300 ${isSubmitted && (isCorrect || (isSelected && !isCorrect)) ? "font-medium" : ""}`}>
                        {opt.text}
                      </span>
                    </div>
                    {icon}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
        {!isSubmitted ? (
          <button
            onClick={handleSubmit}
            disabled={Object.keys(answers).length !== questions.length}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-8 py-3 rounded-full transition-colors shadow-md"
          >
            Submit Answers
          </button>
        ) : (
          <button
            onClick={handleRetry}
            className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium px-8 py-3 rounded-full transition-colors"
          >
            Retry Quiz
          </button>
        )}
      </div>

    </div>
  );
}
