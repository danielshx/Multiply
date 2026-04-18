'use client';
import { useEffect, useRef, useState } from 'react';
import { getBrowserSupabase } from '@/lib/supabase/client';

/**
 * Subscribes to messages for a single us_outreach call. Combines:
 *   1. Initial select (no .order — PostgREST returned 0 rows with order)
 *   2. Realtime INSERT subscription
 *   3. Polling fallback every 3s in case Realtime doesn't connect
 * Filters out fillers, tool/event rows, and Thoughts monologues.
 */
export function useCallMessages(callId) {
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const seenIds = useRef(new Set());

  useEffect(() => {
    if (!callId) {
      setMessages([]);
      seenIds.current = new Set();
      return;
    }

    const sb = getBrowserSupabase();
    let cancelled = false;
    seenIds.current = new Set();
    setMessages([]);

    const keep = (row) => {
      if (!row?.content) return false;
      const c = row.content;
      if (c.startsWith('<Thoughts>')) return false;
      if (row.role === 'event') return false;
      return true;
    };

    const addRows = (rows) => {
      if (!rows || rows.length === 0) return;
      setMessages((prev) => {
        let changed = false;
        const byId = new Map(prev.map((m) => [m.id, m]));
        for (const r of rows) {
          if (!keep(r)) continue;
          if (!byId.has(r.id)) {
            byId.set(r.id, r);
            seenIds.current.add(r.id);
            changed = true;
          }
        }
        if (!changed) return prev;
        return Array.from(byId.values()).sort((a, b) => {
          const ta = new Date(a.ts ?? 0).getTime();
          const tb = new Date(b.ts ?? 0).getTime();
          return ta - tb;
        });
      });
    };

    const fetchAll = async () => {
      const { data } = await sb
        .from('us_outreach_messages')
        .select('id, call_id, role, content, ts, hr_msg_id')
        .eq('call_id', callId)
        .limit(500);
      if (cancelled) return;
      addRows(data ?? []);
    };

    fetchAll();

    const ch = sb
      .channel(`realtime:us_outreach_messages:${callId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'us_outreach_messages',
          filter: `call_id=eq.${callId}`,
        },
        (payload) => {
          const row = payload.new;
          if (!row) return;
          addRows([row]);
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnected(true);
      });

    // Polling fallback — runs regardless of Realtime state, every 3s.
    const poll = setInterval(() => {
      if (!cancelled) fetchAll();
    }, 3000);

    return () => {
      cancelled = true;
      sb.removeChannel(ch);
      clearInterval(poll);
      setConnected(false);
    };
  }, [callId]);

  return { messages, connected };
}
