import React from "react";
import Link from "next/link";

interface EmptyStateProps {
  eyebrow: string;
  headline: string;
  lede?: React.ReactNode;
  ctaLabel?: string;
  ctaHref?: string;
  onCta?: () => void;
  variant?: "empty" | "error";
}

export default function EmptyState({
  eyebrow,
  headline,
  lede,
  ctaLabel,
  ctaHref,
  onCta,
  variant = "empty",
}: EmptyStateProps) {
  const isError = variant === "error";

  return (
    <div className="es-wrap">
      {isError ? (
        <div className="es-error-pill" role="status">
          <span className="status-pill-dot" aria-hidden="true" />
          {eyebrow}
        </div>
      ) : (
        <p className="es-eyebrow">{eyebrow}</p>
      )}
      <h2 className="es-headline">{headline}</h2>
      {lede && <p className="es-lede">{lede}</p>}
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className={isError ? "ed-btn ghost no-underline" : "ed-btn-outline no-underline"}
        >
          {ctaLabel}
        </Link>
      )}
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          className={isError ? "ed-btn ghost" : "ed-btn-outline"}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
