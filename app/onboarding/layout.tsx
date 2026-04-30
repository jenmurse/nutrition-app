export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-register="editorial" style={{ height: '100%' }}>
      {children}
    </div>
  );
}
