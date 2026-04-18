'use client';
import React, { useEffect, useRef, useState } from 'react';

/**
 * Animated revenue counter in the top bar. Counts up continuously to feel
 * like live pipeline growth during the pitch.
 */
export function RevenueTicker() {
  const [value, setValue] = useState(1_247_000);
  const [delta, setDelta] = useState(0);
  const targetRef = useRef(1_247_000);

  useEffect(() => {
    const grow = () => {
      const inc = Math.floor(Math.random() * 6_000) + 800;
      targetRef.current += inc;
      setDelta(inc);
      setTimeout(() => setDelta(0), 1600);
    };
    const id = setInterval(grow, 4200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let raf;
    const step = () => {
      setValue((v) => {
        const t = targetRef.current;
        if (v === t) return v;
        const diff = t - v;
        return v + Math.max(1, Math.round(diff * 0.08));
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 1,
      padding: '3px 10px',
      background: 'var(--bg-subtle)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      minWidth: 140,
      position: 'relative',
    }}>
      <div style={{
        fontSize: 9,
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontFamily: 'var(--mono)',
        fontWeight: 500,
      }}>
        Pipeline value
      </div>
      <div className="mono" style={{
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--success)',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: -0.1,
      }}>
        €{value.toLocaleString('de-DE')}
      </div>
      {delta > 0 && (
        <div style={{
          position: 'absolute',
          right: 10,
          bottom: -18,
          fontSize: 10,
          color: 'var(--success)',
          fontFamily: 'var(--mono)',
          fontWeight: 500,
          animation: 'revenueFloat 1.6s ease-out forwards',
          pointerEvents: 'none',
        }}>
          +€{delta.toLocaleString('de-DE')}
        </div>
      )}
      <style jsx>{`
        @keyframes revenueFloat {
          0%   { opacity: 0; transform: translateY(0); }
          20%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(-18px); }
        }
      `}</style>
    </div>
  );
}
