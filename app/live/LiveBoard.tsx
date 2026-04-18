"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { subscribeLeads, subscribeMessages } from "@/lib/supabase/realtime";

export type Lead = {
  id: string;
  created_at: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  interest: string | null;
  stage: string | null;
  current_mode: string | null;
  source: string | null;
  metadata: Record<string, unknown> | null;
};

export type Message = {
  id: string;
  lead_id: string | null;
  ts: string;
  role: string | null;
  content: string | null;
  channel: string | null;
  hr_msg_id: string | null;
};

type Props = {
  initialLeads: Lead[];
  initialMessages: Message[];
};

export function LiveBoard({ initialLeads, initialMessages }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  useEffect(() => {
    const u1 = subscribeLeads((p) => {
      if (p.eventType === "INSERT" && p.new) {
        setLeads((prev) => [p.new as Lead, ...prev]);
      } else if (p.eventType === "UPDATE" && p.new) {
        const next = p.new as Lead;
        setLeads((prev) => prev.map((l) => (l.id === next.id ? next : l)));
      } else if (p.eventType === "DELETE" && p.old) {
        const old = p.old as Lead;
        setLeads((prev) => prev.filter((l) => l.id !== old.id));
      }
    });
    const u2 = subscribeMessages(null, (p) => {
      if (p.eventType === "INSERT" && p.new) {
        setMessages((prev) => [p.new as Message, ...prev].slice(0, 1000));
      }
    });
    return () => {
      u1();
      u2();
    };
  }, []);

  const messagesByLead = useMemo(() => {
    const map = new Map<string, Message[]>();
    for (const m of messages) {
      const key = m.lead_id ?? "_unmatched";
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
    }
    return map;
  }, [messages]);

  const orderedLeads = useMemo(() => {
    const lastTs = (id: string) => {
      const arr = messagesByLead.get(id);
      if (!arr || arr.length === 0) return 0;
      return new Date(arr[arr.length - 1].ts).getTime();
    };
    return [...leads].sort((a, b) => {
      const tA = Math.max(lastTs(a.id), new Date(a.created_at ?? 0).getTime());
      const tB = Math.max(lastTs(b.id), new Date(b.created_at ?? 0).getTime());
      return tB - tA;
    });
  }, [leads, messagesByLead]);

  const unmatched = messagesByLead.get("_unmatched") ?? [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {orderedLeads.map((lead) => (
        <LeadCard
          key={lead.id}
          lead={lead}
          messages={messagesByLead.get(lead.id) ?? []}
        />
      ))}
      {unmatched.length > 0 && (
        <UnmatchedCard messages={unmatched} />
      )}
      {orderedLeads.length === 0 && (
        <div className="col-span-full text-sm text-neutral-500 mono p-8 text-center">
          No leads yet. Run{" "}
          <code className="text-neutral-300">pnpm tsx scripts/seed-trio.ts --reset</code>{" "}
          and trigger the watcher.
        </div>
      )}
    </div>
  );
}

function LeadCard({ lead, messages }: { lead: Lead; messages: Message[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const last = messages[messages.length - 1];
  const company =
    (lead.metadata?.["company"] as string | undefined) ?? "(no company)";
  const heat = (lead.current_mode ?? "cold") as "cold" | "warm" | "hot";
  const stage = lead.stage ?? "new";

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [messages.length]);

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 flex flex-col overflow-hidden h-[520px]">
      <header className="p-3 border-b border-neutral-800 bg-neutral-950">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold truncate">{lead.name ?? "(no name)"}</div>
            <div className="text-xs text-neutral-400 truncate">{company}</div>
          </div>
          <HeatBadge heat={heat} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] mono text-neutral-400">
          <span className="truncate">📞 {lead.phone ?? "—"}</span>
          <span className="truncate">✉️ {lead.email ?? "—"}</span>
          <span className="truncate col-span-2">
            🎯 {lead.interest ?? "—"}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-neutral-500">
            stage: {stage}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-neutral-500 text-right">
            {messages.length} msgs
          </span>
        </div>
      </header>
      <div ref={ref} className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
        {messages.length === 0 && (
          <div className="text-xs text-neutral-600 mono">
            (no activity yet)
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </div>
      {last && (
        <footer className="p-2 border-t border-neutral-800 text-[10px] mono text-neutral-500">
          last: {new Date(last.ts).toLocaleTimeString()} · {last.channel ?? "?"}
        </footer>
      )}
    </div>
  );
}

function UnmatchedCard({ messages }: { messages: Message[] }) {
  return (
    <div className="rounded-lg border border-amber-700 bg-amber-950/30 flex flex-col overflow-hidden h-[520px]">
      <header className="p-3 border-b border-amber-700 bg-amber-950/50">
        <div className="font-semibold">Unmatched messages</div>
        <div className="text-[11px] mono text-amber-300/70 mt-1">
          Activity not yet linked to a lead row ({messages.length})
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const role = message.role ?? "system";
  const channel = message.channel ?? "?";
  const ts = new Date(message.ts).toLocaleTimeString();

  const bubbleClass =
    role === "agent"
      ? "self-end bg-emerald-900/40 border-emerald-800"
      : role === "lead"
        ? "self-start bg-sky-900/40 border-sky-800"
        : "self-stretch bg-neutral-800/60 border-neutral-700";

  return (
    <div className={`flex flex-col ${role === "agent" ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-full rounded-md border px-2 py-1.5 ${bubbleClass}`}
      >
        <div className="text-[10px] mono text-neutral-400 uppercase tracking-wide mb-0.5">
          {role} · {channel} · {ts}
        </div>
        <div className="whitespace-pre-wrap break-words text-[13px] leading-snug">
          {message.content ?? "(empty)"}
        </div>
      </div>
    </div>
  );
}

function HeatBadge({ heat }: { heat: "cold" | "warm" | "hot" }) {
  const map = {
    hot: "bg-red-900/50 text-red-300 border-red-800",
    warm: "bg-orange-900/50 text-orange-300 border-orange-800",
    cold: "bg-sky-900/50 text-sky-300 border-sky-800",
  };
  return (
    <span
      className={`text-[10px] mono uppercase tracking-wide px-1.5 py-0.5 rounded border ${map[heat]}`}
    >
      {heat}
    </span>
  );
}
