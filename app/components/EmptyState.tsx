import React from "react";
import Link from "next/link";

interface EmptyStateProps {
  eyebrow: string;
  headline: string;
  lede: React.ReactNode;
  ctaLabel?: string;
  ctaHref?: string;
  onCta?: () => void;
}

export default function EmptyState({ eyebrow, headline, lede, ctaLabel, ctaHref, onCta }: EmptyStateProps) {
  return (
    <div className="es-wrap">
      <p className="es-eyebrow">{eyebrow}</p>
      <h2 className="es-headline">{headline}</h2>
      <p className="es-lede">{lede}</p>
      {ctaLabel && ctaHref && (
        <Link href={ctaHref} className="ed-btn-outline no-underline">
          {ctaLabel}
        </Link>
      )}
      {ctaLabel && onCta && (
        <button onClick={onCta} className="ed-btn-outline">
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
