import { useEffect, useState } from "react";

interface Props {
  words: string[];
  /** ms per character while typing */
  typeSpeed?: number;
  /** ms per character while deleting */
  deleteSpeed?: number;
  /** ms the word stays fully shown before deleting */
  holdMs?: number;
  className?: string;
}

type Phase = "typing" | "holding" | "deleting";

export default function TypewriterWord({
  words,
  typeSpeed = 70,
  deleteSpeed = 40,
  holdMs = 1800,
  className = "",
}: Props) {
  const [wordIndex, setWordIndex] = useState(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("typing");

  useEffect(() => {
    const current = words[wordIndex];
    let timer: number;

    if (phase === "typing") {
      if (text.length < current.length) {
        timer = window.setTimeout(
          () => setText(current.slice(0, text.length + 1)),
          typeSpeed
        );
      } else {
        timer = window.setTimeout(() => setPhase("holding"), 0);
      }
    } else if (phase === "holding") {
      timer = window.setTimeout(() => setPhase("deleting"), holdMs);
    } else {
      if (text.length > 0) {
        timer = window.setTimeout(
          () => setText(current.slice(0, text.length - 1)),
          deleteSpeed
        );
      } else {
        setWordIndex((i) => (i + 1) % words.length);
        setPhase("typing");
      }
    }

    return () => window.clearTimeout(timer);
  }, [text, phase, wordIndex, words, typeSpeed, deleteSpeed, holdMs]);

  return (
    <span className={className}>
      {text}
      <span
        aria-hidden
        className="ml-1 inline-block h-[0.85em] w-[0.06em] translate-y-[0.06em] bg-current animate-caret"
      />
    </span>
  );
}
