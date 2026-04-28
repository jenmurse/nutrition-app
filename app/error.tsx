"use client";

import EmptyState from "./components/EmptyState";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState
      variant="error"
      eyebrow="Sync error"
      headline="Couldn't reach the kitchen."
      lede="Your changes are saved locally. We'll sync when you're back online — nothing's lost."
      ctaLabel="Try again"
      onCta={reset}
    />
  );
}
