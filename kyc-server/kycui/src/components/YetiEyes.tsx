
import React from "react";

interface YetiEyesProps {
  isWatching: boolean;
  onClick: () => void;
  className?: string;
}

const YetiEyes: React.FC<YetiEyesProps> = ({ isWatching, onClick, className }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-5 w-5 text-muted-foreground hover:text-foreground transition-colors ${className}`}
      aria-label={isWatching ? "Hide password" : "Show password"}
    >
      {isWatching ? (
        // Yeti with open eyes
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 4C7 4 3 7 1 12C3 17 7 20 12 20C17 20 21 17 23 12C21 7 17 4 12 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <path d="M8 7C8.5 6.5 9.5 6 10.5 6C11.5 6 12 7 12 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M16 7C15.5 6.5 14.5 6 13.5 6C12.5 6 12 7 12 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8 3L7 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M16 3L17 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : (
        // Yeti with closed eyes
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 4C7 4 3 7 1 12C3 17 7 20 12 20C17 20 21 17 23 12C21 7 17 4 12 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M9 13C10 12 11 12 12 12C13 12 14 12 15 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8 7C8.5 6.5 9.5 6 10.5 6C11.5 6 12 7 12 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M16 7C15.5 6.5 14.5 6 13.5 6C12.5 6 12 7 12 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8 3L7 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M16 3L17 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
};

export default YetiEyes;
