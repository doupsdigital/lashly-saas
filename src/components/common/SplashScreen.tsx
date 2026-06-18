import { useState, useEffect } from 'react';

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export default function SplashScreen() {
  const [visible, setVisible] = useState(() => isStandalone());
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const fadeTimer = setTimeout(() => setFading(true), 1800);
    const hideTimer = setTimeout(() => setVisible(false), 2400);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center"
      style={{
        backgroundColor: '#F7F3EE',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.6s ease-out',
      }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center gap-6">
        <div
          className="rounded-[28px] overflow-hidden shadow-lg"
          style={{ width: 100, height: 100 }}
        >
          <img
            src="/logo-login.png"
            alt="Lash Hub"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Nome em Cormorant Garamond */}
        <div className="flex flex-col items-center gap-1">
          <h1
            className="font-title font-semibold tracking-widest text-text-primary"
            style={{ fontSize: '2rem', letterSpacing: '0.15em' }}
          >
            Lash Hub
          </h1>
          <p
            className="text-text-muted uppercase tracking-[0.3em] font-sans"
            style={{ fontSize: '0.6rem' }}
          >
            Gestão & Agendamentos
          </p>
        </div>
      </div>

      {/* Linha decorativa */}
      <div
        className="absolute bottom-16 flex items-center gap-2 opacity-40"
      >
        <div className="w-8 h-px bg-text-muted" />
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: '#A85560' }}
        />
        <div className="w-8 h-px bg-text-muted" />
      </div>
    </div>
  );
}
