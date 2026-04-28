import EmptyState from "./components/EmptyState";

export default function NotFound() {
  return (
    <EmptyState
      eyebrow="§ Not found"
      headline="Nothing here."
      lede="The page you're looking for doesn't exist, or may have moved."
      ctaLabel="Go home"
      ctaHref="/"
    />
  );
}
