export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-register="editorial" style={{ background: 'var(--bg)', height: '100%' }}>
      {children}
    </div>
  );
}
