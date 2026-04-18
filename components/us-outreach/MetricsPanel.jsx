'use client';
import React, { useMemo } from 'react';
import { Panel } from '@/components/multiply/ui';

/**
 * MetricsPanel — aggregate stats across all calls. Computed from the already-
 * loaded calls array so no extra DB round-trip.
 */
export function MetricsPanel({ calls, messageCounts = {}, commission }) {
  const m = useMemo(() => computeMetrics(calls, messageCounts, commission), [
    calls,
    messageCounts,
    commission,
  ]);

  return (
    <Panel title="Analytics" subtitle="across all calls">
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Row 1 — volume + revenue */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 10,
          }}
        >
          <Kpi label="Placed" value={m.placed} />
          <Kpi label="Connected" value={m.connected} accent="info" />
          <Kpi label="Closed" value={m.closed} accent="success" />
          <Kpi
            label="Connect rate"
            value={m.connectRate != null ? `${m.connectRate.toFixed(0)}%` : '—'}
            mono
          />
          <Kpi
            label="Close rate"
            value={m.closeRate != null ? `${m.closeRate.toFixed(0)}%` : '—'}
            mono
            accent="success"
          />
          <Kpi
            label="Earnings"
            value={`$${m.earnings.toFixed(0)}`}
            mono
            accent="accent"
          />
        </div>

        {/* Row 2 — timing */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 10,
          }}
        >
          <Kpi label="Total call mins" value={fmtMins(m.totalTalkSec)} mono />
          <Kpi label="Avg call length" value={fmtSec(m.avgTalkSec)} mono />
          <Kpi label="Longest" value={fmtSec(m.maxTalkSec)} mono />
          <Kpi label="Total msgs" value={m.totalMessages} />
          <Kpi
            label="Msgs per call"
            value={m.avgMessages != null ? m.avgMessages.toFixed(1) : '—'}
            mono
          />
          <Kpi
            label="Time to close"
            value={m.avgTimeToCloseSec != null ? fmtSec(m.avgTimeToCloseSec) : '—'}
            mono
          />
        </div>

        {/* Row 3 — breakdowns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
          <Breakdown label="Disposition" items={m.byDisposition} total={m.placed} />
          <Breakdown label="Country" items={m.byCountry} total={m.placed} />
        </div>

        {/* Row 4 — failure reasons if any */}
        {m.failedReasons.length > 0 && (
          <Breakdown label="Failure reasons" items={m.failedReasons} total={m.failed} compact />
        )}
      </div>
    </Panel>
  );
}

function computeMetrics(calls, messageCounts, commission) {
  const placed = calls.length;
  const connected = calls.filter(
    (c) => c.status === 'live' || c.status === 'completed',
  ).length;
  const closed = calls.filter((c) => c.disposition === 'closed').length;
  const failed = calls.filter((c) => c.status === 'failed').length;

  const talkDurations = calls
    .map((c) => c.talk_duration_sec ?? c.duration_sec ?? 0)
    .filter((d) => d > 0);
  const totalTalkSec = talkDurations.reduce((a, b) => a + b, 0);
  const avgTalkSec = talkDurations.length
    ? Math.round(totalTalkSec / talkDurations.length)
    : 0;
  const maxTalkSec = talkDurations.length ? Math.max(...talkDurations) : 0;

  const totalMessages = Object.values(messageCounts).reduce((a, b) => a + b, 0);
  const avgMessages = placed > 0 ? totalMessages / placed : null;

  // Time from trigger to close for closed calls
  const timeToClose = calls
    .filter((c) => c.disposition === 'closed' && c.closed_at && c.created_at)
    .map(
      (c) =>
        (new Date(c.closed_at).getTime() - new Date(c.created_at).getTime()) / 1000,
    );
  const avgTimeToCloseSec = timeToClose.length
    ? Math.round(timeToClose.reduce((a, b) => a + b, 0) / timeToClose.length)
    : null;

  const earnings = closed * commission;

  const connectRate = placed > 0 ? (connected / placed) * 100 : null;
  const closeRate = connected > 0 ? (closed / connected) * 100 : null;

  // Breakdowns
  const byDisposition = tally(
    calls,
    (c) => c.disposition || 'no_disposition',
  );
  const byCountry = tally(calls, (c) => c.country_code || codeFromPhone(c.phone_number));
  const failedReasons = tally(
    calls.filter((c) => c.status === 'failed'),
    (c) => (c.reason ?? 'unknown').slice(0, 60),
  );

  return {
    placed,
    connected,
    closed,
    failed,
    connectRate,
    closeRate,
    earnings,
    totalTalkSec,
    avgTalkSec,
    maxTalkSec,
    totalMessages,
    avgMessages,
    avgTimeToCloseSec,
    byDisposition,
    byCountry,
    failedReasons,
  };
}

function tally(arr, keyFn) {
  const counts = new Map();
  for (const item of arr) {
    const k = keyFn(item) || 'unknown';
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function codeFromPhone(phone) {
  if (!phone) return 'unknown';
  const m = phone.match(/^\+(\d{1,3})/);
  if (!m) return 'unknown';
  const cc = m[1];
  const map = { 1: 'US', 49: 'DE', 43: 'AT', 41: 'CH', 44: 'GB', 33: 'FR' };
  return map[cc] ?? `+${cc}`;
}

function Kpi({ label, value, accent = 'neutral', mono }) {
  const colors = {
    neutral: 'var(--text)',
    accent: 'var(--accent)',
    success: 'var(--success)',
    info: 'var(--info)',
  };
  return (
    <div
      style={{
        background: 'var(--bg-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: 'var(--text-tertiary)',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 500,
          letterSpacing: -0.4,
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

function Breakdown({ label, items, total, compact = false }) {
  if (items.length === 0) {
    return (
      <div>
        <SectionLabel>{label}</SectionLabel>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: 8 }}>No data yet.</div>
      </div>
    );
  }
  const maxCount = Math.max(...items.map((i) => i.count));
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 4 : 6 }}>
        {items.slice(0, compact ? 4 : 8).map((it) => {
          const pct = total > 0 ? Math.round((it.count / total) * 100) : 0;
          const barPct = maxCount > 0 ? (it.count / maxCount) * 100 : 0;
          return (
            <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span
                style={{
                  minWidth: 110,
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontFamily: compact ? 'var(--mono)' : 'var(--sans)',
                  fontSize: compact ? 11 : 12,
                }}
              >
                {it.label}
              </span>
              <div
                style={{
                  flex: 1,
                  background: 'var(--bg-subtle)',
                  borderRadius: 999,
                  overflow: 'hidden',
                  height: 6,
                }}
              >
                <div
                  style={{
                    width: `${barPct}%`,
                    height: '100%',
                    background: 'var(--accent)',
                    borderRadius: 999,
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  color: 'var(--text-tertiary)',
                  minWidth: 48,
                  textAlign: 'right',
                  fontSize: 11,
                }}
              >
                {it.count} · {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 10,
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function fmtSec(sec) {
  if (!sec && sec !== 0) return '—';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtMins(sec) {
  if (!sec && sec !== 0) return '—';
  const mins = sec / 60;
  if (mins < 1) return `${sec}s`;
  if (mins < 10) return `${mins.toFixed(1)}m`;
  return `${Math.round(mins)}m`;
}
