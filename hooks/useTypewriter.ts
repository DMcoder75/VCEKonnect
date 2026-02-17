import { useState, useEffect, useRef } from 'react';

interface TypewriterOptions {
  text: string;
  speed?: number; // Characters per second
  onComplete?: () => void;
  slowDownNearEnd?: boolean; // For placeholder: slow down if nearing end
  transitionText?: string; // For response: text to show after completion before revealing all
  snailPace?: boolean; // For placeholder: very slow typing (10 chars/sec)
}

export function useTypewriter({ 
  text, 
  speed = 30, 
  onComplete,
  slowDownNearEnd = false,
  transitionText = '',
  snailPace = false,
}: TypewriterOptions) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const indexRef = useRef(0);
  const currentSpeedRef = useRef(speed);

  useEffect(() => {
    // Reset when text changes
    setDisplayedText('');
    setIsComplete(false);
    setIsTransitioning(false);
    indexRef.current = 0;
    // Use very slow speed for snail pace mode
    currentSpeedRef.current = snailPace ? 10 : speed;

    if (!text) return;

    const typeNextChar = () => {
      if (indexRef.current < text.length) {
        setDisplayedText(text.slice(0, indexRef.current + 1));
        indexRef.current++;
        
        // Dynamic speed adjustment for placeholder
        if (slowDownNearEnd) {
          const progress = indexRef.current / text.length;
          if (progress > 0.7) {
            // Slow down progressively as we approach the end
            currentSpeedRef.current = speed * (1 - (progress - 0.7) * 1.5);
          }
        }
        
        const intervalMs = 1000 / Math.max(currentSpeedRef.current, 5); // Minimum 5 chars/sec
        timeoutRef.current = setTimeout(typeNextChar, intervalMs);
      } else {
        // Reached end of main text
        if (transitionText && !isTransitioning) {
          // Start transition phase
          setIsTransitioning(true);
          startTransition();
        } else {
          setIsComplete(true);
          onComplete?.();
        }
      }
    };

    const startTransition = () => {
      let transitionIndex = 0;
      const fastSpeed = speed * 2; // Type transition text faster
      const fullTextWithTransition = text + ' ' + transitionText;
      
      const typeTransitionChar = () => {
        if (transitionIndex < transitionText.length + 1) {
          setDisplayedText(fullTextWithTransition.slice(0, text.length + 1 + transitionIndex));
          transitionIndex++;
          timeoutRef.current = setTimeout(typeTransitionChar, 1000 / fastSpeed);
        } else {
          // Transition complete, reveal full response
          setTimeout(() => {
            setDisplayedText(text);
            setIsComplete(true);
            setIsTransitioning(false);
            onComplete?.();
          }, 200); // Brief pause before revealing all
        }
      };
      
      timeoutRef.current = setTimeout(typeTransitionChar, 1000 / fastSpeed);
    };

    const intervalMs = 1000 / speed;
    timeoutRef.current = setTimeout(typeNextChar, intervalMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, speed, onComplete, slowDownNearEnd, transitionText]);

  return {
    displayedText,
    isComplete,
    isTransitioning,
  };
}
