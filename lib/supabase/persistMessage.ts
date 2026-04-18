import { getServerSupabase } from "./server";

/**
 * Server-only helper used by the trigger-* routes to persist outgoing agent
 * activity into the `messages` table so the /live view's Realtime channel
 * picks it up.
 *
 * Best-effort: errors are logged but not thrown, the Watcher pipeline must
 * never fail because of a logging side-effect.
 */
export type PersistMessageInput = {
  lead_id?: string | null;
  role: "agent" | "lead" | "system";
  channel: "phone" | "sms" | "email" | "watcher";
  content: string;
  hr_msg_id?: string | null;
};

export async function persistMessage(input: PersistMessageInput): Promise<void> {
  try {
    const supabase = getServerSupabase();
    const { error } = await supabase.from("messages").insert({
      lead_id: input.lead_id ?? null,
      role: input.role,
      channel: input.channel,
      content: input.content,
      hr_msg_id: input.hr_msg_id ?? null,
    });
    if (error) {
      console.warn(`[persistMessage] supabase error: ${error.message}`);
    }
  } catch (err) {
    console.warn(`[persistMessage] failed: ${(err as Error).message}`);
  }
}

/**
 * Find a lead row by phone OR email so the trigger-* routes (which only
 * have the contact info, not the lead_id) can attach activity to the right
 * card on /live. Returns null if no match — caller can still persist with
 * lead_id=null and the live view will bucket it as "Unmatched".
 */
export async function findLeadIdByContact(
  contact: { phone?: string | null; email?: string | null },
): Promise<string | null> {
  const phone = contact.phone?.trim();
  const email = contact.email?.trim();
  if (!phone && !email) return null;
  try {
    const supabase = getServerSupabase();
    const orParts: string[] = [];
    if (email) orParts.push(`email.eq.${email}`);
    if (phone) orParts.push(`phone.eq.${phone}`);
    const { data, error } = await supabase
      .from("leads")
      .select("id")
      .or(orParts.join(","))
      .limit(1);
    if (error || !data || data.length === 0) return null;
    return data[0].id as string;
  } catch {
    return null;
  }
}
