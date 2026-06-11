import type { ReactNode } from "react";
import { useAccess } from "./AccessProvider";

/**
 * Anchor that routes to `to` when access is unlocked, otherwise pops the access
 * code modal over the current page (the landing video keeps playing behind it).
 */
export default function GatedLink({
  to,
  className,
  children,
  "aria-label": ariaLabel,
}: {
  to: string;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  const { requestAccess } = useAccess();
  return (
    <a
      href={to}
      aria-label={ariaLabel}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        requestAccess(to);
      }}
    >
      {children}
    </a>
  );
}
