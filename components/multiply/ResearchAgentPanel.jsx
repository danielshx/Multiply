'use client';
import React, { useEffect, useState } from 'react';
import { Dot, Kbd } from './ui';

export function ResearchAgentPanel({ open, onClose, showToast }) {
  const [topic, setTopic] = useState('');
  const [agent, setAgent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastRun, setLastRun] = useState(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && open) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const start = async () => {
    const t = topic.trim();
    const a = agent.trim();
    if (!t || !a) {
      showToast?.('Topic and agent name are both required.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/research/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: t, agent: a }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        showToast?.(`Research agent failed: ${data.error ?? res.statusText}`, 'danger');
        setLastRun({ ok: false, topic: t, agent: a, error: data.error ?? res.statusText });
      } else {
        showToast?.(`Agent “${a}” dispatched · topic: ${t}`, 'success');
        setLastRun({ ok: true, topic: t, agent: a, at: new Date() });
      }
    } catch (err) {
      showToast?.(`Network error: ${err?.message ?? 'unknown'}`, 'danger');
      setLastRun({ ok: false, topic: t, agent: a, error: String(err?.message ?? err) });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10,10,10,0.35)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 1500,
        animation: 'backdrop-in 150ms ease',
      }}
    >
      <aside
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(440px, 92vw)',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border-strong)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slide-in-right 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <span style={{ fontSize: 18 }}>🔎</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              Research Agent
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--mono)' }}>
              Google Maps candidate discovery · HR workflow
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 8px',
              fontSize: 12,
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
            }}
          >
            <Kbd>Esc</Kbd>
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1 }}>
          <Field label="Agent name" hint="Used to tag the candidates this run produces.">
            <input
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              placeholder="e.g. Berlin Coffee Scout"
              disabled={submitting}
              style={inputStyle}
            />
          </Field>

          <Field label="Topic" hint="What should the agent research? Google Maps query.">
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. specialty coffee shops in Berlin Mitte with >4.3 rating"
              disabled={submitting}
              rows={5}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--sans)' }}
            />
          </Field>

          <button
            onClick={start}
            disabled={submitting || !topic.trim() || !agent.trim()}
            style={{
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: '#fff',
              background: submitting ? 'var(--accent-soft)' : 'var(--accent)',
              border: '1px solid var(--accent-border)',
              borderRadius: 'var(--radius-md)',
              cursor: submitting || !topic.trim() || !agent.trim() ? 'not-allowed' : 'pointer',
              opacity: !topic.trim() || !agent.trim() ? 0.55 : 1,
              transition: 'all 120ms ease',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {submitting ? (
              <>
                <Dot color="accent" pulse size={6} />
                Dispatching…
              </>
            ) : (
              <>Start Agent →</>
            )}
          </button>

          {lastRun && (
            <div
              style={{
                marginTop: 4,
                padding: 12,
                border: `1px solid ${lastRun.ok ? 'var(--success-border)' : 'var(--danger-border)'}`,
                background: lastRun.ok ? 'var(--success-soft)' : 'var(--danger-soft)',
                borderRadius: 'var(--radius-md)',
                fontSize: 12,
                color: lastRun.ok ? 'var(--success)' : 'var(--danger)',
                fontFamily: 'var(--mono)',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {lastRun.ok ? 'Dispatched' : 'Failed'}
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>
                agent · {lastRun.agent}
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>
                topic · {lastRun.topic}
              </div>
              {lastRun.error && (
                <div style={{ marginTop: 4 }}>error · {lastRun.error}</div>
              )}
            </div>
          )}

          <div
            style={{
              marginTop: 'auto',
              padding: 12,
              border: '1px dashed var(--border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 11,
              color: 'var(--text-tertiary)',
              lineHeight: 1.5,
            }}
          >
            Candidates returned by HappyRobot land in{' '}
            <code style={{ fontFamily: 'var(--mono)', color: 'var(--text-secondary)' }}>
              googlemaps_candidates
            </code>{' '}
            via the{' '}
            <code style={{ fontFamily: 'var(--mono)', color: 'var(--text-secondary)' }}>
              /api/research/agent/callback
            </code>{' '}
            webhook.
          </div>
        </div>
      </aside>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 13,
  background: 'var(--bg-subtle)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text)',
  outline: 'none',
};

function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</span>
      {children}
      {hint && (
        <span style={{ fontSize: 11, color: 'var(--text-quaternary)' }}>{hint}</span>
      )}
    </label>
  );
}
