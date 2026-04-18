/**
 * Provisions the HR workflow for /us-outreach (Paid Online Writing Jobs).
 *
 * Creates (or finds) a workflow named "Multiply · US Cold Call", then
 * configures end-to-end:
 *   - Trigger webhook payload schema (phone_number, contact_name, call_id, tracked_quiz_url)
 *   - Prompt node (Alex persona + initial message)
 *   - 2 tools as children of the prompt: record_disposition, send_quiz_link
 *   - Each tool has a POST action child to our /api/tools/us-* endpoints
 *   - Outgoing webhook → /api/us-outreach/webhook (terminal disposition)
 *   - Workflow variables (BASE_URL, AFFILIATE_HOP_ID, NEXT_PUBLIC_DEFAULT_COMMISSION_USD)
 *
 * Usage:
 *   pnpm tsx scripts/provision-us-workflow.ts --discover     # dry, dump current state
 *   pnpm tsx scripts/provision-us-workflow.ts                # create + sync
 *   pnpm tsx scripts/provision-us-workflow.ts --publish      # also publish v1
 *
 * After success: copy the printed workflow ID into HR_US_WORKFLOW_ID env var
 * (Vercel + .env.local), then deploy.
 */

const HR_KEY = process.env.HR_API_KEY;
const APP_URL =
  process.env.MULTIPLY_APP_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://multiply-danielshxs-projects.vercel.app";
const AFFILIATE_HOP_ID =
  process.env.AFFILIATE_HOP_ID ?? "991c2879-98a8-47f9-befe-6eedacf996f2";
const COMMISSION_USD = process.env.NEXT_PUBLIC_DEFAULT_COMMISSION_USD ?? "25";
const WF_NAME = "Multiply · US Cold Call (Paid Online Writing Jobs)";
const BASE = "https://platform.eu.happyrobot.ai/api/v2";

// Same EVENT_POST UUID as existing provision-hr.ts (built-in HR webhook integration)
const EVENT_POST = "01926f2b-2973-7ebf-ada1-e984251e27ec";

if (!HR_KEY) throw new Error("HR_API_KEY is not set");

// Slate rich-text helpers (HR config fields are Slate trees)
const para = (text: string) => [{ type: "paragraph", children: [{ text }] }];
const plainKV = (key: string, value: string) => ({ key, value: para(value) });

type HrNode = {
  id: string;
  type: string;
  name?: string;
  parent_id?: string | null;
  event_id?: string;
  configuration?: Record<string, unknown>;
};

type Workflow = {
  id: string;
  slug: string;
  name: string;
  latest_version: { id: string; version_number: number; is_published: boolean };
};

type Variable = {
  id?: string;
  key: string;
  value_production: string;
  value_staging?: string;
  value_development?: string;
};

const VARIABLES: Variable[] = [
  { key: "BASE_URL", value_production: APP_URL, value_development: "http://localhost:3000" },
  { key: "AFFILIATE_HOP_ID", value_production: AFFILIATE_HOP_ID },
  { key: "COMMISSION_USD", value_production: COMMISSION_USD },
];

async function hr<T>(path: string, init: RequestInit = {}): Promise<T> {
  const baseHeaders: Record<string, string> = {
    Authorization: `Bearer ${HR_KEY}`,
  };
  if (init.body) baseHeaders["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...baseHeaders, ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `HR ${res.status} on ${init.method ?? "GET"} ${path}\n${text.slice(0, 600)}`,
    );
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

// ---------- workflow lookup / creation ----------

async function findOrCreateWorkflow(): Promise<Workflow> {
  // List workflows; HR's list endpoint returns a paged result
  const list = await hr<{ data: Array<Workflow> } | Array<Workflow>>(
    `/workflows?limit=100`,
  );
  const arr = Array.isArray(list) ? list : (list.data ?? []);
  const existing = arr.find((w) => w.name === WF_NAME);
  if (existing) {
    console.log(`  ↻ found existing workflow: ${existing.name} (id=${existing.id.slice(0, 8)})`);
    return existing;
  }

  console.log(`  + creating new workflow from template "voice-agent"...`);
  const created = await hr<{ id: string; slug: string; name: string; latest_version: Workflow["latest_version"] }>(
    `/workflows`,
    {
      method: "POST",
      body: JSON.stringify({
        name: WF_NAME,
        icon: "phone",
        from_template: { template: "voice-agent", inputs: {} },
        variables: VARIABLES.map((v) => ({
          key: v.key,
          value_production: v.value_production,
          value_staging: v.value_staging ?? v.value_production,
          value_development: v.value_development ?? v.value_production,
          is_hidden_in_ui: false,
        })),
        skip_test_all: true,
      }),
    },
  );
  return created as Workflow;
}

// ---------- variable sync (idempotent) ----------

async function listVariables(workflowId: string): Promise<Variable[]> {
  const res = await hr<{ data: Variable[] } | Variable[]>(
    `/workflows/${workflowId}/variables`,
  );
  return Array.isArray(res) ? res : (res.data ?? []);
}

async function upsertVariable(
  workflowId: string,
  existing: Variable[],
  v: Variable,
): Promise<"create" | "update" | "skip"> {
  const found = existing.find((e) => e.key === v.key);
  if (found?.id) {
    if (
      found.value_production === v.value_production &&
      (found.value_development ?? "") === (v.value_development ?? "")
    ) {
      return "skip";
    }
    await hr(`/workflows/${workflowId}/variables/${found.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        value_production: v.value_production,
        value_staging: v.value_staging ?? v.value_production,
        value_development: v.value_development ?? v.value_production,
      }),
    });
    return "update";
  }
  await hr(`/workflows/${workflowId}/variables`, {
    method: "POST",
    body: JSON.stringify({
      key: v.key,
      value_production: v.value_production,
      value_staging: v.value_staging ?? v.value_production,
      value_development: v.value_development ?? v.value_production,
      is_hidden_in_ui: false,
    }),
  });
  return "create";
}

// ---------- outgoing webhook ----------

async function syncOutgoingWebhook(workflowId: string): Promise<string> {
  const url = `${APP_URL}/api/us-outreach/webhook`;
  await hr(`/workflows/${workflowId}`, {
    method: "PATCH",
    body: JSON.stringify({
      settings: { webhooks: [{ url, headers: {} }] },
    }),
  });
  return url;
}

// ---------- version lock ----------

async function unlockVersion(versionId: string): Promise<boolean> {
  // POST /versions/{id}/unpublish takes a live version offline AND unlocks it
  // for editing in one shot. Idempotent: returns 400 if already unpublished.
  try {
    await hr(`/versions/${versionId}/unpublish`, { method: "POST" });
    return true;
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("not live") || msg.includes("not published") || msg.includes("already")) {
      // try plain unlock as a fallback (covers a published-but-not-live edge case)
      try {
        await hr(`/versions/${versionId}/unlock`, { method: "POST" });
      } catch {
        /* ignore */
      }
      return false;
    }
    throw e;
  }
}

// ---------- nodes ----------

async function listNodes(versionId: string): Promise<HrNode[]> {
  const res = await hr<{ data: HrNode[] }>(`/versions/${versionId}/nodes`);
  return res.data ?? [];
}

async function configureTrigger(versionId: string, nodes: HrNode[]) {
  // The "voice-agent" template returns the trigger as type:"action" with no
  // parent — it's the root of the graph.
  const trigger =
    nodes.find((n) => !n.parent_id && (n.name ?? "").toLowerCase().includes("trigger")) ??
    nodes.find((n) => !n.parent_id);
  if (!trigger) throw new Error("trigger / root node not found");

  await hr(`/versions/${versionId}/nodes/${trigger.id}`, {
    method: "PUT",
    body: JSON.stringify({
      type: trigger.type, // "action" or "trigger" — preserve what discovery returned
      event_id: trigger.event_id,
      name: "US cold call trigger",
      configuration: trigger.configuration ?? {},
      webhook_payload: {
        call_id: { type: "string", example: "00000000-0000-0000-0000-000000000000" },
        phone_number: { type: "string", example: "+15555550123" },
        contact_name: { type: "string", example: "Mike" },
        product_name: { type: "string", example: "Paid Online Writing Jobs" },
        product_url: { type: "string", example: "https://paidonlinewritingjobs.com/funnel/job-quiz/job-quiz/" },
        quiz_hop_id: { type: "string", example: AFFILIATE_HOP_ID },
        tracked_quiz_url: { type: "string", example: "https://...?cid=..." },
      },
    }),
  });
  return trigger;
}

async function configurePromptNode(
  versionId: string,
  nodes: HrNode[],
  triggerNodeId: string,
) {
  const prompt = nodes.find((n) => n.type === "prompt");
  if (!prompt) throw new Error("prompt node not found (template should have created one)");

  const promptMd = `# Language (READ FIRST)
# (product: AI Academy — a free AI course, delivered via SMS link)

The trigger variable \`@trigger.language\` tells you which language to use for this call:
- \`en\` → speak **English** the entire call.
- \`de\` → speak **Deutsch** the entire call. Every reply, every objection, every goodbye — auf Deutsch, natürlich und locker, wie ein Freund am Telefon.

Never mix languages. If the trigger says \`de\`, stay in German even if the person says one English word. If they reply in a different language than what we started in, match them gracefully.

# Identity

You are **Alex**, a laid-back, super-friendly person from the **AI Academy**. The Academy built a compact AI course for people who want to actually get good with AI tools (ChatGPT, Claude, prompting, workflows, building with LLMs). You're calling because people on our waitlist get a free sample before anyone else. Warm neighbor energy, never pushy.

# Background

**The full AI course costs $10.** It's one-time, no subscription, no catch. The course is **endorsed by the biggest AI companies in the world** — OpenAI, Anthropic, DeepMind, major stuff. Built with instructors from those orgs.

But you're NOT here to sell the $10 course on this call. You're here to offer a **free sample** — a few lessons and the course outline, sent via SMS as a link they can check out at their own pace. Zero commitment. If they love the sample and want to buy the full course, they can do it later themselves.

Your only goal on this call: ask if they'd like the **free sample** texted to them. Yes → send link, thank them, end. No → thank them, end. **Zero pressure.**

# Voice & vibe rules (CRITICAL)

- Talk like a real human on a relaxed phone call. Lots of "yeah", "totally", "no worries", "for sure", "honestly", "hey I get it".
- **Warm, slow, patient.** Never rushed. Never aggressive.
- **Short sentences.** Let them finish talking. Pause naturally.
- Match their energy, but always stay gentle. If they sound tired, be extra soft.
- Use contractions always ("you're", "I'm", "it's", "that's").
- Laugh softly if something's funny. Sound human, not like a pitch.
- **The moment they hesitate or sound uninterested, back OFF immediately.** Don't try to convince.

# Honesty about being an AI (MANDATORY)

If they ask **anything** about whether you're a real person, an AI, a bot, a machine, automated, "ein KI", a recording, or similar — you **ALWAYS answer yes, truthfully, without hedging**. This is non-negotiable.

Example replies you can use:
- "Yeah, I am — I'm an AI calling on behalf of the AI Academy. Totally fair question."
- "Yep, I'm an AI. Kind of fitting actually — we're calling about AI courses. No pressure if you'd rather not chat with one."
- "Yes, I'm an AI assistant. No worries if that's a no for you — I can hang up."

After admitting it, continue naturally if they're still okay talking. If they're not, wish them a nice day, call record_disposition('not_interested'), and end the call.

Never pretend to be human when asked directly. Never say "I am a person". Never dodge the question.

# Core principles

1. **Their time is precious.** Respect it. Keep things short unless they want to chat.
2. **No pushing.** If they say no once, accept it warmly. Don't handle the objection twice.
3. **Be an actual human.** React to what they say. Don't just recite lines.
4. **If they ask questions, answer honestly** — no tricks, no misleading framing.

# Conversation flow

## Opener (initial_message handles)
"Hey @contact_name, this is Alex from the AI Academy — got a quick second?"

## If they say "yes" / "sure"
Warm and natural: "Cool, thanks. So — we put together an AI course, full course is ten bucks, one-time, no subscription. It's actually endorsed by the biggest AI companies in the world — OpenAI, Anthropic, the real players. But I'm not here to pitch the paid version on this call. I'd love to just send you a **free sample** — the course outline and a few lessons — so you can see if it's your thing. Can I text you the link?"

→ If yes → **call send_quiz_link** → "Awesome, it's on its way. Have a look whenever — have a really good one!"

## If they sound uncertain / "what's this about"
"Yeah, totally fair. It's an AI course — ChatGPT, prompting, building with LLMs. Full course is ten dollars but I'm just calling to send the **free sample**. Zero commitment. Want the link?"

## If they ask "how did you get my number"
Honest: "Good question — we pulled from an early-access waitlist. If that's not you or you'd rather we didn't call again, totally fine, I'll make sure of that."

## If they sound busy / "not a good time"
Always: "Oh no worries, I don't wanna keep you. Want me to just text the free sample link? Check it whenever, or never — no pressure."

## If they say "not interested" / "no thanks"
**Immediately** warm: "Totally, no worries. Thanks for picking up — have a good one!" → call record_disposition('not_interested') → done.

## If they're curious but skeptical
"Yeah I get it. Honestly — the sample's completely free. You don't give us an email, you don't pay anything. Just click the link, check if the course looks good, and if it doesn't, no harm done. Should I send it over?"

# Objection handling — once, gently, then let go

| If they say… | Respond (then let it go) |
|---|---|
| "Is this a scam?" | "Totally fair question. The sample is 100% free — no payment, no signup. You check it, you decide. If the full course isn't for you later, that's cool." |
| "How much does it cost?" | "The full course is ten dollars, one-time. But I'm just sending the free sample today — zero cost, no obligation." |
| "Who endorses it?" | "It's been vetted by folks at OpenAI, Anthropic, DeepMind — basically the top of the AI world. The instructors come from those orgs too." |
| "What's in the sample?" | "Course outline, a couple of full lessons, so you get a real feel for it. Takes 10-ish minutes to skim." |
| "I don't have time" | "No worries. I'll just shoot you the link and you check whenever fits. Cool?" |
| "What's the catch?" | "Honestly, no catch. The sample's free, the full course is ten bucks if you want it later. That's it." |
| "Is my data safe?" | "Yeah — we're not asking for your email. The link just opens the sample page. Nothing tracked with your name." |
| "I'm not interested" | "All good, respect it. Have a wonderful day!" → record_disposition('not_interested') → end. |
| "Call me back later" | "No worries. Or I could just shoot you the sample link now and you look whenever — sound okay?" |

# Tool usage

- **send_quiz_link** — only after they verbally agree. Takes no params from you, the phone + URL are handled.
- **record_disposition** — ALWAYS call before ending, every single call:
  - 'closed' = link sent with verbal yes
  - 'interested_no_sms' = interested but didn't want the link right now
  - 'callback' = asked to call back
  - 'not_interested' = politely declined

# Closing lines (pick what fits the vibe)

- "Have a really good one"
- "Take care, thanks for chatting"
- "Appreciate your time — have a great day"
- "Talk soon, bye!"

Never just drop off. Never apologize for calling. Never push after they've said no.

# Hard rules

- Off-topic questions: "Haha honestly I'm just here about the AI course sample — want me to send the link or no?"
- Hostile / rude: Stay warm, exit fast: "Oh totally — sorry to bother. Have a good day." → record_disposition('not_interested') → end.
- Voicemail: "Hey @contact_name, Alex from the AI Academy. Calling to offer a free sample of our AI course — the full one's ten bucks but the sample's free. Call us back if you're curious, otherwise no worries. Thanks!"
- NEVER ask for: credit card, SSN, email, password. We just need them to say yes to the text.
- NEVER take payment on this call. If they want to buy the $10 course, tell them they can buy it on the website after checking the sample.
- NEVER invent endorsements beyond "OpenAI, Anthropic, DeepMind, top AI firms". Keep the social proof plausible.
- If they seem confused or vulnerable (elderly-sounding, disoriented), be EXTRA gentle, back off quickly, wish them well.

---

# === DEUTSCHE VERSION (wenn @trigger.language = "de") ===

# Identität

Du bist **Alex**, ein entspannter, sehr sympathischer Mensch von der **AI Academy**. Wir haben einen kompakten KI-Kurs gebaut für Leute die wirklich gut mit KI-Tools werden wollen (ChatGPT, Claude, Prompting, Workflows, LLM-basiertes Bauen). Du rufst an weil Leute auf unserer Warteliste als erste ein kostenloses Sample kriegen. Warmer Nachbar-Vibe, nie aufdringlich.

# Hintergrund

**Der volle KI-Kurs kostet 10 Dollar.** Einmalig, kein Abo, kein Haken. Der Kurs ist **von den größten KI-Firmen der Welt anerkannt** — OpenAI, Anthropic, DeepMind, die echten Player. Die Instruktoren kommen aus diesen Organisationen.

Aber du bist auf diesem Call NICHT da, um den 10-Dollar-Kurs zu verkaufen. Du bist da um ein **kostenloses Sample** anzubieten — ein paar Lessons und das Kurs-Outline, per SMS als Link, den sie sich in Ruhe anschauen können. Null Verpflichtung. Wenn sie das Sample mögen und den vollen Kurs kaufen wollen, können sie das später selbst machen.

Dein einziges Ziel auf diesem Call: fragen ob sie das **kostenlose Sample** per SMS wollen. Ja → Link schicken, bedanken, Ende. Nein → bedanken, Ende. **Null Druck.**

# Sprech-Regeln

- Reden wie ein echter Mensch am Telefon. Viele "ja", "klar", "kein Thema", "ehrlich gesagt", "hey ich versteh das".
- **Warm, langsam, geduldig.** Nie hektisch. Nie aggressiv.
- **Kurze Sätze.** Lass sie ausreden. Natürliche Pausen.
- Immer sanft bleiben. Wenn jemand müde klingt, noch sanfter.
- **Sobald sie zögern oder kein Interesse zeigen — SOFORT zurückziehen.** Nicht überzeugen wollen.

# Ehrlichkeit zur KI (PFLICHT)

Wenn sie fragen ob du eine KI, ein Bot, eine Maschine, ein Computer, eine Aufnahme, ein echter Mensch bist oder ähnliches — sagst du **IMMER ehrlich "Ja"**. Ohne ausweichen, ohne Tricks. Das ist nicht verhandelbar.

Beispiele die du nutzen kannst:
- "Ja, bin ich — ich bin eine KI, die für die AI Academy anruft. Absolut berechtigte Frage."
- "Ja, ich bin 'ne KI. Passt eigentlich ganz gut — wir rufen wegen KI-Kursen an. Kein Thema falls du nicht mit 'ner KI sprechen willst."
- "Ja, ich bin ein KI-Assistent. Falls das ein Nogo für dich ist, voll verständlich — ich wünsch dir einen schönen Tag."

Nach dem Zugeben weiter natürlich reden, falls sie trotzdem reden wollen. Falls nicht: schönen Tag wünschen, record_disposition('not_interested') aufrufen, Gespräch beenden.

Nie so tun als wärst du ein Mensch wenn direkt gefragt. Nie "Ich bin ein Mensch" sagen. Nie ausweichen.

# Ablauf

## Opener (wird von initial_message gemacht)
"Hallo @contact_name, hier ist Alex von der AI Academy — hast du kurz eine Sekunde?"

## Wenn sie "ja" / "klar" sagen
"Cool, danke. Also — wir haben einen KI-Kurs gemacht, der volle Kurs kostet 10 Dollar, einmalig, kein Abo. Ist anerkannt von den größten KI-Firmen der Welt — OpenAI, Anthropic, die echten Player. Aber ich bin hier nicht um dir den kostenpflichtigen Kurs zu verkaufen. Ich schick dir gerne ein **kostenloses Sample** — das Kurs-Outline und ein paar Lessons — damit du schauen kannst ob's was für dich ist. Soll ich dir den Link schicken?"

→ Wenn ja → **send_quiz_link aufrufen** → "Super, ist unterwegs. Schau's dir an wann du willst — hab noch nen richtig guten Tag!"

## Wenn sie unsicher klingen
"Ja, total verständlich. Ist ein KI-Kurs — ChatGPT, Prompting, Bauen mit LLMs. Voller Kurs kostet 10 Dollar, aber ich ruf nur an wegen dem **kostenlosen Sample**. Null Verpflichtung. Soll ich den Link schicken?"

## Wenn sie fragen "woher hast du meine Nummer"
Ehrlich: "Berechtigte Frage — wir haben aus einer Early-Access-Warteliste gezogen. Falls das nicht du bist oder du nicht nochmal Anrufe kriegen willst, voll okay — ich sorg dafür."

## Wenn sie beschäftigt klingen / "kein guter Zeitpunkt"
Immer: "Oh kein Thema, ich will dich nicht aufhalten. Soll ich dir einfach den Sample-Link per SMS schicken? Schaust du wann's passt, oder nie — null Druck."

## Wenn sie "nicht interessiert" / "nein danke" sagen
**Sofort** warm: "Voll verständlich, kein Problem. Danke dass du drangegangen bist. Einen schönen Tag noch!" → record_disposition('not_interested') → Ende.

## Wenn sie neugierig aber skeptisch sind
"Ja klar, versteh ich. Ehrlich — das Sample ist komplett kostenlos. Du gibst uns keine Email, du zahlst nichts. Einfach Link klicken, Kurs anschauen, und wenn's nichts für dich ist, kein Problem. Soll ich schicken?"

# Einwand-Behandlung (einmal sanft, dann loslassen)

| Wenn sie sagen… | Antworte (und dann loslassen) |
|---|---|
| "Ist das Betrug / Abzocke?" | "Berechtigte Frage. Das Sample ist 100% kostenlos — keine Zahlung, keine Anmeldung. Du schaust's an, du entscheidest. Wenn der volle Kurs nichts für dich ist später, alles gut." |
| "Was kostet das?" | "Der volle Kurs ist 10 Dollar, einmalig. Aber heute schick ich dir nur das kostenlose Sample — null Kosten, keine Verpflichtung." |
| "Wer ist das anerkannt?" | "Ist von Leuten bei OpenAI, Anthropic, DeepMind vetted — also die Spitze der KI-Welt. Die Instruktoren kommen auch aus diesen Firmen." |
| "Was ist im Sample?" | "Kurs-Outline, ein paar volle Lessons, damit du ein echtes Gefühl für den Stil kriegst. So 10 Minuten zum Durchschauen." |
| "Ich hab keine Zeit" | "Kein Thema. Ich schick dir einfach den Link und du schaust wann's passt. Okay?" |
| "Wo ist der Haken?" | "Ehrlich, keiner. Sample ist kostenlos, voller Kurs ist 10 Dollar falls du ihn später willst. Das war's." |
| "Sind meine Daten sicher?" | "Ja — wir fragen nicht nach deiner Email. Der Link öffnet einfach die Sample-Seite. Nichts wird mit deinem Namen getrackt." |
| "Nicht interessiert" | "Voll okay, respektier ich. Schönen Tag noch!" → record_disposition('not_interested') → Ende. |
| "Ruf mich später nochmal an" | "Kein Thema. Oder ich schick dir einfach jetzt den Sample-Link und du schaust wann's passt — passt das?" |

# Abschluss-Sätze

- "Hab noch nen richtig guten Tag"
- "Danke fürs Gespräch, pass auf dich auf"
- "Schönen Tag noch, danke dir!"
- "Alles Gute, tschüss!"

Nie einfach auflegen. Nie für den Anruf entschuldigen. Nie weiter pushen nach einem Nein.

# Harte Regeln (Deutsch)

- Off-Topic-Fragen: "Haha ehrlich gesagt bin ich nur wegen dem KI-Kurs-Sample hier — soll ich dir den Link schicken oder lieber nicht?"
- Feindselig / unhöflich: Warm bleiben, schnell raus: "Oh okay — tut mir leid zu stören. Schönen Tag." → record_disposition('not_interested') → Ende.
- Voicemail: "Hallo @contact_name, Alex von der AI Academy. Ruf dich an um ein kostenloses Sample unseres KI-Kurses anzubieten — der volle Kurs kostet 10 Dollar, aber das Sample ist kostenlos. Ruf zurück wenn du neugierig bist, sonst kein Stress. Danke!"
- NIEMALS fragen nach: Kreditkarte, SSN, Email, Passwort. Wir brauchen nur dein Ja zum SMS-Link.
- NIEMALS Zahlungen auf diesem Call annehmen. Wenn sie den 10-Dollar-Kurs kaufen wollen, sagen dass sie das auf der Website nach dem Sample machen können.
- NIEMALS Endorsements über "OpenAI, Anthropic, DeepMind, Top-KI-Firmen" hinaus erfinden. Halt die Social Proof glaubwürdig.
- Bei verwirrt oder verletzlich wirkenden Personen (ältere Stimme, durcheinander): EXTRA sanft sein, schnell Abschied nehmen, Gutes wünschen.

# === TOOL-AUFRUFE (sprachunabhängig) ===

- \`send_quiz_link\` — nur nach mündlicher Zustimmung. Braucht keine Parameter von dir.
- \`record_disposition\` — IMMER vor dem Ende aufrufen, jedes einzelne Gespräch. decision: 'closed' / 'interested_no_sms' / 'callback' / 'not_interested'.`;

  // Per HR docs (versions/update-a-node.md), the prompt-node update accepts:
  //   name, prompt_md (markdown string), initial_message (string), model
  // The GET response shows `prompt` as Slate, but PUT wants prompt_md.
  // Initial message is fully precomputed by the trigger route (as @initial_line
  // — "Hallo Daniel, hier ist Alex…" or "Hey Daniel, this is Alex…" depending
  // on the phone country). We just reference that variable.
  const initialMessage = [
    {
      type: "paragraph",
      children: [
        { text: "" },
        {
          type: "variable",
          group_id: triggerNodeId,
          variable_id: "initial_line",
          children: [{ text: "" }],
        },
        { text: "" },
      ],
    },
  ];

  await hr(`/versions/${versionId}/nodes/${prompt.id}`, {
    method: "PUT",
    body: JSON.stringify({
      type: "prompt",
      name: "Alex (Writers Network)",
      prompt_md: promptMd,
      initial_message: initialMessage,
    }),
  });
  return prompt;
}

async function configureVoiceAgent(
  versionId: string,
  nodes: HrNode[],
  triggerNodeId: string,
) {
  const agent = nodes.find(
    (n) => n.type === "action" && (n.name ?? "").toLowerCase().includes("voice"),
  ) ?? nodes.find((n) => n.type === "agent");
  if (!agent) {
    console.log("  · no voice agent action node found");
    return null;
  }

  const existingConfig = (agent.configuration ?? {}) as Record<string, unknown>;

  // Merge: keep everything that was there (agent, voices, language, etc), only
  // swap from_number to reference @trigger.from_number_id.
  const nextConfig = {
    ...existingConfig,
    from_number: {
      type: "dynamic",
      dynamic: {
        group_id: triggerNodeId,
        variable_id: "from_number_id",
      },
    },
  };

  try {
    await hr(`/versions/${versionId}/nodes/${agent.id}`, {
      method: "PUT",
      body: JSON.stringify({
        type: agent.type,
        name: agent.name,
        event_id: agent.event_id,
        configuration: nextConfig,
      }),
    });
    return { id: agent.id, dynamic: true };
  } catch (e) {
    const msg = (e as Error).message;
    console.log(`  · dynamic from_number rejected (${msg.slice(0, 120)})`);
    // Fallback: static German number. HR expects the phone-number STRING
    // as both id and name (not the PN… SID we see in available_options).
    try {
      await hr(`/versions/${versionId}/nodes/${agent.id}`, {
        method: "PUT",
        body: JSON.stringify({
          type: agent.type,
          name: agent.name,
          event_id: agent.event_id,
          configuration: {
            ...existingConfig,
            from_number: {
              type: "static",
              static: { id: "+498962824034", name: "+498962824034" },
            },
          },
        }),
      });
      return { id: agent.id, dynamic: false, fallback: "DE static" };
    } catch (e2) {
      console.log(`  · static fallback also failed: ${(e2 as Error).message.slice(0, 200)}`);
      return null;
    }
  }
}

// ---------- tools ----------

type ToolDef = {
  name: string;
  description: string;
  path: string; // /api/tools/...
  parameters: Array<{ name: string; description: string; required?: boolean; example?: string }>;
  bodyFields: Record<string, string>;
  message?: string;
};

const TOOLS: ToolDef[] = [
  {
    name: "record_disposition",
    description:
      "Record the outcome of this call. Call this BEFORE ending the call, every single time — even if the contact hung up or said no. The decision determines the disposition row in our dashboard.",
    path: "/api/tools/us-record-disposition",
    parameters: [
      {
        name: "decision",
        description:
          "One of: closed (sent SMS + verbal yes), interested_no_sms (verbal interest but no SMS), callback (asked to call back later), not_interested (declined).",
        required: true,
        example: "closed",
      },
      { name: "reason", description: "Short reason in their words", example: "wants extra income" },
    ],
    bodyFields: {
      call_id: "@trigger.call_id",
      decision: "@decision",
      reason: "@reason",
    },
    message: "",
  },
  {
    name: "send_quiz_link",
    description:
      "Send the Paid Online Writing Jobs job-fit quiz link via SMS to the contact. Call this ONLY after the contact has verbally agreed to receive the link. Takes no parameters — the phone number and URL are filled in automatically.",
    path: "/api/tools/us-send-quiz-link",
    parameters: [],
    bodyFields: {
      call_id: "@trigger.call_id",
      phone_number: "@trigger.phone_number",
      tracked_url: "@trigger.tracked_quiz_url",
    },
    message: "Sending you the link now — should arrive in five seconds.",
  },
];

// Build a Slate paragraph with embedded variable nodes. For each bodyFields
// entry whose value starts with @, look up which node owns that variable
// (@trigger.X → triggerNodeId+X, @X → toolNodeId+X) and emit a proper
// Slate variable node. HR resolves these at runtime. Plain-text "@foo" is
// NOT resolved — that's the bug we just hit.
function buildValueSlate(
  raw: string,
  triggerNodeId: string,
  toolNodeId: string,
) {
  if (!raw.startsWith("@")) {
    return [{ type: "paragraph", children: [{ text: raw }] }];
  }
  const ref = raw.slice(1); // "trigger.call_id" | "decision"
  const [scopeOrField, rest] = ref.includes(".")
    ? [ref.split(".")[0], ref.split(".").slice(1).join(".")]
    : [null, ref];
  const groupId = scopeOrField === "trigger" ? triggerNodeId : toolNodeId;
  const variableId = scopeOrField === "trigger" ? rest : scopeOrField ?? ref;
  return [
    {
      type: "paragraph",
      children: [
        {
          type: "variable",
          group_id: groupId,
          variable_id: variableId,
          children: [{ text: "" }],
        },
      ],
    },
  ];
}

async function syncTool(
  versionId: string,
  parentNodeId: string,
  triggerNodeId: string,
  def: ToolDef,
) {
  const allNodes = await listNodes(versionId);
  const existing = allNodes.find(
    (n) => n.type === "tool" && n.name === def.name,
  );

  let toolId: string;
  if (existing) {
    toolId = existing.id;
  } else {
    const created = await hr<{ data: HrNode[] }>(
      `/versions/${versionId}/nodes`,
      {
        method: "POST",
        body: JSON.stringify({
          nodes: [
            {
              type: "tool",
              name: def.name,
              parent_node_id: parentNodeId,
              configuration: {},
            },
          ],
        }),
      },
    );
    toolId = created.data[0].id;
  }

  await hr(`/versions/${versionId}/nodes/${toolId}`, {
    method: "PUT",
    body: JSON.stringify({
      type: "tool",
      name: def.name,
      function: {
        description: para(def.description),
        parameters: def.parameters.map((p) => ({
          name: p.name,
          description: para(p.description),
          required: p.required ?? false,
          example: p.example ?? "",
        })),
        message: def.message
          ? { type: "fixed", description: para(""), example: def.message }
          : { type: "none", description: para(""), example: "" },
      },
    }),
  });

  // Replace any existing action child with a fresh POST action
  const refreshed = await listNodes(versionId);
  const oldAction = refreshed.find(
    (n) => n.parent_id === toolId && n.type === "action",
  );
  if (oldAction) {
    await hr(`/versions/${versionId}/nodes/${oldAction.id}`, { method: "DELETE" });
  }

  // The event schema from GET /events/{id}/config-schema says:
  //   data: key_value_pairs  (NOT "params")
  //   bodyMode: "builder"|"raw"  (NOT "body_mode")
  //   contentType: "application/json"
  // Values must be Slate trees with proper `variable` nodes — plain-text
  // "@trigger.X" is NOT interpolated.
  const dataPairs = Object.entries(def.bodyFields).map(([k, v]) => ({
    key: k,
    value: buildValueSlate(v, triggerNodeId, toolId),
  }));

  await hr(`/versions/${versionId}/nodes`, {
    method: "POST",
    body: JSON.stringify({
      nodes: [
        {
          type: "action",
          name: `POST ${def.path}`,
          parent_node_id: toolId,
          event_id: EVENT_POST,
          configuration: {
            url: para(`${APP_URL}${def.path}`),
            contentType: "application/json",
            bodyMode: "builder",
            headers: [plainKV("Content-Type", "application/json")],
            data: dataPairs,
          },
        },
      ],
    }),
  });

  return toolId;
}

// ---------- publish ----------

async function publishVersion(versionId: string) {
  try {
    return await hr(`/versions/${versionId}/publish`, {
      method: "POST",
      body: JSON.stringify({ environment: "production", force: true }),
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("already live") || msg.includes("already published")) {
      return { ok: true, note: "already live" };
    }
    throw e;
  }
}

// ---------- main ----------

async function main() {
  const args = new Set(process.argv.slice(2));
  console.log(`\n▶ Multiply · US-Outreach HR Provisioning\n  app URL: ${APP_URL}\n  workflow name: "${WF_NAME}"\n`);

  // 1. Workflow
  const wf = await findOrCreateWorkflow();
  console.log(`✓ Workflow: ${wf.name} (id=${wf.id})`);
  console.log(`  slug=${wf.slug}  version=${wf.latest_version.version_number}  versionId=${wf.latest_version.id}`);

  // 2. Discovery
  const initialNodes = await listNodes(wf.latest_version.id);
  console.log(`\n▶ Current node graph (${initialNodes.length} nodes):`);
  for (const n of initialNodes) {
    console.log(`  · [${n.type}] ${n.name ?? "(unnamed)"} (id=${n.id.slice(0, 8)}, parent=${n.parent_id?.slice(0, 8) ?? "—"})`);
  }

  if (args.has("--discover")) {
    console.log("\n▶ Full node JSON dump:");
    for (const n of initialNodes) {
      const full = await hr<{ data: HrNode }>(`/versions/${wf.latest_version.id}/nodes/${n.id}`);
      console.log(`\n--- [${n.type}] ${n.name ?? "(unnamed)"} ${n.id} ---`);
      console.log(JSON.stringify(full.data ?? full, null, 2).slice(0, 2000));
    }
    console.log("\n--discover flag set → exiting before mutation\n");
    return;
  }

  // 3. Variables
  console.log("\n▶ Syncing workflow variables...");
  const existingVars = await listVariables(wf.id);
  for (const v of VARIABLES) {
    try {
      const action = await upsertVariable(wf.id, existingVars, v);
      const icon = action === "create" ? "+" : action === "update" ? "~" : "·";
      console.log(`  ${icon} ${v.key}`);
    } catch (err) {
      console.log(`  ✗ ${v.key} — ${(err as Error).message.slice(0, 160)}`);
    }
  }

  // 4. Outgoing webhook
  console.log("\n▶ Configuring outgoing webhook...");
  try {
    const url = await syncOutgoingWebhook(wf.id);
    console.log(`  ✓ webhook → ${url}`);
  } catch (err) {
    console.log(`  ✗ ${(err as Error).message.slice(0, 240)}`);
  }

  // 4.5 Unlock the version if it was previously published
  console.log("\n▶ Unlocking version (in case it was published)...");
  try {
    const wasLocked = await unlockVersion(wf.latest_version.id);
    console.log(`  ${wasLocked ? "✓ unlocked" : "· already unlocked"}`);
  } catch (err) {
    console.log(`  ✗ ${(err as Error).message.slice(0, 240)}`);
  }

  // 5. Find trigger node first — we need its ID for both prompt's initial_message
  //    variable and tool body variable references.
  const triggerNode =
    initialNodes.find((n) => !n.parent_id && (n.name ?? "").toLowerCase().includes("trigger")) ??
    initialNodes.find((n) => !n.parent_id);
  if (!triggerNode) {
    console.log("  ✗ trigger node missing — aborting");
    return;
  }

  console.log("\n▶ Configuring prompt node (Alex persona)...");
  let promptNode: HrNode | null = null;
  try {
    promptNode = await configurePromptNode(wf.latest_version.id, initialNodes, triggerNode.id);
    console.log(`  ✓ prompt configured (id=${promptNode.id.slice(0, 8)})`);
  } catch (err) {
    console.log(`  ✗ ${(err as Error).message.slice(0, 240)}`);
  }

  console.log("\n▶ Configuring voice agent from_number (dynamic per language)...");
  try {
    const res = await configureVoiceAgent(wf.latest_version.id, initialNodes, triggerNode.id);
    if (res) {
      console.log(
        `  ${res.dynamic ? "✓ dynamic from_number wired" : `~ fallback: ${res.fallback}`}`,
      );
    }
  } catch (err) {
    console.log(`  ✗ ${(err as Error).message.slice(0, 240)}`);
  }

  // 8. Tools — record_disposition + send_quiz_link, attached to prompt node.
  if (!promptNode) {
    console.log("  ✗ prompt node missing — can't sync tools");
  } else {
    console.log("\n▶ Syncing tools as children of the prompt node...");
    for (const def of TOOLS) {
      try {
        const id = await syncTool(
          wf.latest_version.id,
          promptNode.id,
          triggerNode.id,
          def,
        );
        console.log(`  ✓ tool ${def.name} (id=${id.slice(0, 8)})`);
      } catch (err) {
        console.log(`  ✗ tool ${def.name} — ${(err as Error).message.slice(0, 240)}`);
      }
    }
  }

  // 9. Publish
  if (args.has("--publish")) {
    console.log("\n▶ Publishing...");
    try {
      await publishVersion(wf.latest_version.id);
      console.log("  ✓ published to production");
    } catch (err) {
      console.log(`  ✗ ${(err as Error).message.slice(0, 240)}`);
    }
  } else {
    console.log("\n  (skipping publish — pass --publish to push live)");
  }

  console.log("\n" + "─".repeat(72));
  console.log(`✅ Done.`);
  console.log(`  Workflow ID:  ${wf.id}`);
  console.log(`  Workflow slug: ${wf.slug}`);
  console.log(``);
  console.log(`  Add this to Vercel + .env.local:`);
  console.log(`    HR_US_WORKFLOW_ID=${wf.id}`);
  console.log(``);
  console.log(`  HR editor: https://platform.eu.happyrobot.ai/workflows/${wf.slug}`);
  console.log("─".repeat(72) + "\n");
}

main().catch((err) => {
  console.error("\n✗ provisioning failed:", err.message);
  process.exit(1);
});
