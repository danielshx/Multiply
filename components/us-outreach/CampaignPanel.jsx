'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Panel, Field, TextArea, Button, IconPhone } from '@/components/multiply/ui';

const STORAGE_KEY = 'us-outreach-campaign-v1';

/**
 * CampaignPanel — paste N numbers, set batch + interval, click Start. Every
 * <interval> seconds we fire <batchSize> triggers in parallel, pop those from
 * the queue, and stop when empty. State persists to localStorage so a page
 * reload doesn't lose the remaining queue.
 */
export function CampaignPanel({ onTrigger }) {
  const [queue, setQueue] = useState([]);
  const [dialed, setDialed] = useState([]);
  const [errorCount, setErrorCount] = useState(0);
  const [rawText, setRawText] = useState('');
  const [batchSize, setBatchSize] = useState(10);
  const [intervalSec, setIntervalSec] = useState(60);
  const [defaultCountry, setDefaultCountry] = useState('49');
  const [running, setRunning] = useState(false);
  const [nextFireAt, setNextFireAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const tickRef = useRef(null);

  // Restore from localStorage once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (Array.isArray(s.queue)) setQueue(s.queue);
        if (Array.isArray(s.dialed)) setDialed(s.dialed);
        if (typeof s.errorCount === 'number') setErrorCount(s.errorCount);
        if (typeof s.batchSize === 'number') setBatchSize(s.batchSize);
        if (typeof s.intervalSec === 'number') setIntervalSec(s.intervalSec);
        if (typeof s.defaultCountry === 'string') setDefaultCountry(s.defaultCountry);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persist on any change
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ queue, dialed, errorCount, batchSize, intervalSec, defaultCountry }),
      );
    } catch {
      /* ignore */
    }
  }, [queue, dialed, errorCount, batchSize, intervalSec, defaultCountry]);

  // Keep `now` ticking for the countdown display
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  // The main firing loop
  useEffect(() => {
    if (!running) {
      if (tickRef.current) clearTimeout(tickRef.current);
      setNextFireAt(null);
      return;
    }
    if (queue.length === 0) {
      setRunning(false);
      setNextFireAt(null);
      return;
    }
    const fireAt = Date.now() + intervalSec * 1000;
    setNextFireAt(fireAt);
    tickRef.current = setTimeout(() => {
      fireBatch();
    }, intervalSec * 1000);
    return () => {
      if (tickRef.current) clearTimeout(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, queue.length, intervalSec]);

  async function fireBatch() {
    const batch = queue.slice(0, batchSize);
    if (batch.length === 0) {
      setRunning(false);
      return;
    }
    // Optimistically pop from queue so repeated timer ticks don't redo
    setQueue((prev) => prev.slice(batch.length));
    let newErrors = 0;
    const newDialed = [];
    await Promise.all(
      batch.map(async (entry) => {
        try {
          const r = await onTrigger({ phone: entry.phone, name: entry.name || 'Friend' });
          if (r.ok) {
            newDialed.push({ ...entry, at: Date.now(), ok: true, call_id: r.call_id });
          } else {
            newErrors++;
            newDialed.push({ ...entry, at: Date.now(), ok: false, error: r.error });
          }
        } catch (err) {
          newErrors++;
          newDialed.push({ ...entry, at: Date.now(), ok: false, error: err.message });
        }
      }),
    );
    setDialed((prev) => [...newDialed, ...prev].slice(0, 500));
    if (newErrors > 0) setErrorCount((x) => x + newErrors);
  }

  function parseAndLoad() {
    const parsed = rawText
      .split('\n')
      .map((l) => parseLine(l, defaultCountry))
      .filter(Boolean);
    // De-dupe by phone
    const seen = new Set(queue.map((q) => q.phone));
    const add = parsed.filter((p) => !seen.has(p.phone));
    setQueue((prev) => [...prev, ...add]);
    setRawText('');
  }

  function clearAll() {
    if (!confirm('Clear queue, history, and all campaign state?')) return;
    setQueue([]);
    setDialed([]);
    setErrorCount(0);
    setRunning(false);
    setRawText('');
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  function fireNow() {
    // Immediate one-shot batch, doesn't touch running state
    fireBatch();
  }

  const total = queue.length + dialed.length;
  const pct = total > 0 ? Math.round((dialed.length / total) * 100) : 0;
  const secToNext = nextFireAt ? Math.max(0, Math.round((nextFireAt - now) / 1000)) : null;
  const etaMin = running && queue.length > 0
    ? Math.ceil((queue.length / batchSize) * intervalSec / 60)
    : null;

  return (
    <Panel
      title="Campaign"
      subtitle="queue-drain · paste → time → auto-dial"
      action={
        <div style={{ display: 'flex', gap: 6 }}>
          {queue.length > 0 && !running && (
            <button
              onClick={() => setRunning(true)}
              style={btnStyle('accent')}
            >
              ▶ Start
            </button>
          )}
          {running && (
            <button onClick={() => setRunning(false)} style={btnStyle('warn')}>
              ⏸ Pause
            </button>
          )}
          {queue.length > 0 && (
            <button onClick={fireNow} style={btnStyle('ghost')} title="Fire one batch right now">
              ⚡ Fire now
            </button>
          )}
          {(queue.length > 0 || dialed.length > 0) && (
            <button onClick={clearAll} style={btnStyle('danger')}>
              Clear
            </button>
          )}
        </div>
      }
    >
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          <Stat label="In queue" value={queue.length} accent="info" />
          <Stat label="Dialed" value={dialed.length} accent="success" />
          <Stat label="Errors" value={errorCount} accent={errorCount > 0 ? 'danger' : 'neutral'} />
          <Stat
            label={running ? 'Next batch' : 'State'}
            value={
              running
                ? secToNext != null
                  ? `${secToNext}s`
                  : '…'
                : queue.length === 0
                  ? 'idle'
                  : 'paused'
            }
            mono
            accent={running ? 'accent' : 'neutral'}
          />
          <Stat label="ETA" value={etaMin != null ? `~${etaMin}m` : '—'} mono />
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div>
            <div style={{ height: 6, background: 'var(--bg-subtle)', borderRadius: 999, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--accent), var(--success))',
                  transition: 'width 300ms ease',
                }}
              />
            </div>
            <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--mono)' }}>
              {dialed.length}/{total} · {pct}%
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <Field label="Batch size" hint="How many calls per interval">
            <NumberInput value={batchSize} onChange={setBatchSize} min={1} max={100} />
          </Field>
          <Field label="Interval (seconds)" hint="Wait between batches">
            <NumberInput value={intervalSec} onChange={setIntervalSec} min={10} max={3600} />
          </Field>
          <Field label="Default country code" hint="For unprefixed numbers">
            <CountryCodeInput value={defaultCountry} onChange={setDefaultCountry} />
          </Field>
        </div>

        {/* Paste area */}
        <Field
          label="Paste numbers (one per line)"
          hint={`Parses on load. "+49…" or raw digits. Name optional. De-duped against existing queue.`}
        >
          <TextArea
            value={rawText}
            onChange={setRawText}
            placeholder={'+4915123456789\n+15551234567\nMike, +447700900123\n15551112222'}
            rows={6}
          />
        </Field>
        <Button
          onClick={parseAndLoad}
          disabled={rawText.trim().length === 0}
          variant="accent"
          size="md"
          icon={<IconPhone size={12} />}
        >
          Load into queue
        </Button>

        {/* History dropdown */}
        {dialed.length > 0 && (
          <details style={{ cursor: 'pointer' }}>
            <summary style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--mono)' }}>
              Show last {Math.min(dialed.length, 20)} dialed
            </summary>
            <div
              style={{
                marginTop: 8,
                maxHeight: 200,
                overflow: 'auto',
                background: 'var(--bg-subtle)',
                padding: 10,
                borderRadius: 'var(--radius-sm)',
                fontSize: 11,
                fontFamily: 'var(--mono)',
              }}
            >
              {dialed.slice(0, 20).map((d, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 10,
                    color: d.ok ? 'var(--text-secondary)' : 'var(--danger)',
                    lineHeight: 1.6,
                  }}
                >
                  <span style={{ color: 'var(--text-tertiary)' }}>
                    {new Date(d.at).toLocaleTimeString()}
                  </span>
                  <span>{d.ok ? '✓' : '✗'}</span>
                  <span>{d.phone}</span>
                  {d.name && <span style={{ color: 'var(--text-tertiary)' }}>({d.name})</span>}
                  {d.error && <span style={{ color: 'var(--danger)' }}>{d.error.slice(0, 50)}</span>}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </Panel>
  );
}

// ---------- helpers ----------

function parseLine(line, defaultCC) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const plusMatch = trimmed.match(/(\+\d[\d\s\-()]{7,})/);
  if (plusMatch) {
    const phone = plusMatch[1].replace(/[\s\-()]/g, '');
    const rest = trimmed.replace(plusMatch[1], '').replace(/[,;]/g, '').trim();
    return { name: rest, phone };
  }
  const digitsMatch = trimmed.match(/([\d\s\-()]{7,})/);
  if (!digitsMatch) return null;
  const digits = digitsMatch[1].replace(/[\s\-()]/g, '');
  if (digits.length < 7) return null;
  const rest = trimmed.replace(digitsMatch[1], '').replace(/[,;]/g, '').trim();
  return { name: rest, phone: `+${defaultCC}${digits.replace(/^0+/, '')}` };
}

function btnStyle(variant) {
  const styles = {
    accent: { bg: 'var(--accent)', fg: '#fff', bd: 'var(--accent)' },
    warn: { bg: 'var(--warning-soft)', fg: 'var(--warning)', bd: 'var(--warning-border)' },
    ghost: { bg: 'var(--surface)', fg: 'var(--text-secondary)', bd: 'var(--border-strong)' },
    danger: { bg: 'var(--surface)', fg: 'var(--danger)', bd: 'var(--danger-border)' },
  };
  const s = styles[variant];
  return {
    fontSize: 11,
    fontFamily: 'var(--mono)',
    padding: '4px 10px',
    background: s.bg,
    color: s.fg,
    border: `1px solid ${s.bd}`,
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
  };
}

function Stat({ label, value, accent = 'neutral', mono }) {
  const colors = {
    neutral: 'var(--text)',
    accent: 'var(--accent)',
    success: 'var(--success)',
    info: 'var(--info)',
    danger: 'var(--danger)',
  };
  return (
    <div
      style={{
        background: 'var(--bg-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 12px',
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: 'var(--text-tertiary)',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 500,
          letterSpacing: -0.3,
          color: colors[accent],
          fontFamily: mono ? 'var(--mono)' : 'var(--sans)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function NumberInput({ value, onChange, min, max }) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (!Number.isNaN(v)) onChange(Math.min(Math.max(v, min ?? 0), max ?? Infinity));
      }}
      style={{
        width: '100%',
        fontSize: 14,
        fontFamily: 'var(--mono)',
        padding: '8px 10px',
        background: 'var(--surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-sm)',
      }}
    />
  );
}

function CountryCodeInput({ value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <span style={{ fontSize: 14, color: 'var(--text-tertiary)', padding: '0 6px', fontFamily: 'var(--mono)' }}>+</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        placeholder="49"
        style={{
          width: '100%',
          fontSize: 14,
          fontFamily: 'var(--mono)',
          padding: '8px 10px',
          background: 'var(--surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-sm)',
        }}
      />
    </div>
  );
}
