'use client';
import React, { useEffect, useState } from 'react';
import { Dot } from './ui';

/**
 * Bloomberg-style bottom status strip. Pings every live backend every 10s
 * and shows latency + status dot. Full-bleed pitch-ready telemetry.
 */
const SERVICES = [
  { key: 'cognee', label: 'Cognee', probe: '/api/cognee/graph', badge: 'Knowledge Graph' },
  { key: 'supabase', label: 'Supabase', probe: '/api/hr-webhook', badge: 'Realtime DB' },
  { key: 'hr', label: 'HappyRobot', probe: '/api/hr-webhook', badge: 'Voice Platform' },
  { key: 'news', label: 'Live News', probe: '/api/news?q=funding', badge: 'RSS feeds' },
];

export function SystemStatusBar() {
  const [stats, setStats] = useState({});
  const [clock, setClock] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const probeAll = async () => {
      const next = { ...stats };
      await Promise.all(
        SERVICES.map(async (s) => {
          const t0 = performance.now();
          try {
            const res = await fetch(s.probe, { method: 'GET', cache: 'no-store' });
            const ms = Math.round(performance.now() - t0);
            next[s.key] = { ok: res.ok, ms };
          } catch {
            next[s.key] = { ok: false, ms: 0 };
          }
        }),
      );
      setStats(next);
    };
    probeAll();
    const id = setInterval(probeAll, 12000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      height: 26,
      borderTop: '1px solid var(--border)',
      background: 'var(--surface)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 16,
      fontSize: 10,
      fontFamily: 'var(--mono)',
      color: 'var(--text-tertiary)',
      letterSpacing: 0.3,
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {SERVICES.map((s) => {
        const st = stats[s.key];
        const status = !st ? 'probing' : st.ok ? 'ok' : 'down';
        const color = status === 'ok' ? 'success' : status === 'down' ? 'danger' : 'warning';
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }} title={s.badge}>
            <Dot color={color} pulse={status === 'ok'} size={5} />
            <span style={{ textTransform: 'uppercase', fontWeight: 500 }}>{s.label}</span>
            {st && <span style={{ color: 'var(--text-quaternary)' }}>{st.ms}ms</span>}
          </div>
        );
      })}
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span>build · prod</span>
        <span>deploy · vercel</span>
        <span>region · fra1</span>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{clock}</span>
      </div>
    </div>
  );
}
