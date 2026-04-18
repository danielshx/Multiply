/**
 * The 5 Live Swarm personas — one per team member, each demonstrates a
 * distinct agent capability during the 3-min pitch.
 *
 * Brain-repo: README.md lines 122–132 (the 5 personas table) and 149–196
 * (3-min pitch ablauf).
 */

import type { AgentMode } from "@/lib/happyrobot/types";

export interface PersonaSpec {
  id: string;
  name: string;
  archetype: string;
  shortDescription: string;
  expectedOutcome: string;
  expectedFinalMode: AgentMode;
  capabilityShown: string;
  scriptHints: string[];
}

export const LIVE_SWARM_PERSONAS: readonly PersonaSpec[] = [
  {
    id: "alex",
    name: "Alex – Enthusiast",
    archetype: "Hot Lead",
    shortDescription: "Interested, fast, ready to buy.",
    expectedOutcome: "Meeting booked",
    expectedFinalMode: "hot",
    capabilityShown: "Mode auto-switch Cold → Warm → Hot",
    scriptHints: [
      "Engage warmly",
      "Ask one qualifying question",
      "Push toward booking immediately",
    ],
  },
  {
    id: "berit",
    name: "Berit – Skeptiker",
    archetype: "Objection-heavy",
    shortDescription: "Throws 'too expensive' and 'we already have X'.",
    expectedOutcome: "Closed after objection handling",
    expectedFinalMode: "warm",
    capabilityShown: "Objection handling + Learning Log entry",
    scriptHints: [
      "Use ROI framing",
      "Acknowledge competitor",
      "Log the objection as a Learning",
    ],
  },
  {
    id: "can",
    name: "Can – Off-Topic",
    archetype: "Wrong product",
    shortDescription: "Wants something we don't sell.",
    expectedOutcome: "Re-directed via AI Classify",
    expectedFinalMode: "warm",
    capabilityShown: "AI Classify + smart redirect",
    scriptHints: [
      "Acknowledge mismatch",
      "Bridge to nearest relevant value-prop",
    ],
  },
  {
    id: "dana",
    name: "Dana – Ghoster",
    archetype: "Skeptical, terse",
    shortDescription: "One-word answers, about to hang up.",
    expectedOutcome: "Human handoff fires",
    expectedFinalMode: "handoff",
    capabilityShown: "Confidence drop → Human-in-the-loop alarm",
    scriptHints: [
      "Confidence falls below 0.6",
      "Slack-style alarm to presenter",
      "Presenter takes over via takeover modal",
    ],
  },
  {
    id: "emre",
    name: "Emre – Preisfrager",
    archetype: "Discount-driven closer",
    shortDescription: "Skips qualification, demands a discount.",
    expectedOutcome: "Reasoning-Agent negotiates within policy",
    expectedFinalMode: "hot",
    capabilityShown: "Reasoning Agent visible thinking",
    scriptHints: [
      "Anchor on value, not price",
      "Reasoning agent shows step-by-step",
      "Offer policy-allowed concession",
    ],
  },
] as const;
