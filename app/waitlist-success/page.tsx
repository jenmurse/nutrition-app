import Link from "next/link";

export default function WaitlistSuccessPage() {
  return (
    <div className="standalone-page" data-register="editorial">
      <header className="standalone-topbar">
        <Link href="/" className="standalone-wordmark">Good Measure</Link>
      </header>
      <div className="standalone-body">
        <div className="standalone-eyebrow">§ Thank you</div>
        <h1 className="standalone-headline">You&rsquo;re on the list.</h1>
        <p className="standalone-lede">
          We&rsquo;ll reach out when Good Measure is ready for the general public.
        </p>
      </div>
    </div>
  );
}
