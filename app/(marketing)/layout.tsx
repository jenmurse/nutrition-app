import MarketingScrollFix from "./_components/MarketingScrollFix";

/**
 * Marketing layout — adds data-marketing to <html> so globals.css can
 * restore native document scroll (the root layout clamps body + main to
 * overflow-hidden for the app shell; the landing needs to undo that).
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingScrollFix />
      <div data-register="editorial">
        {children}
      </div>
    </>
  );
}
