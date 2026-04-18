/**
 * Supabase Realtime helpers — subscribe to lead + message changes for the
 * dashboard.
 *
 * Stub. Implement with `getBrowserSupabase().channel(...)` in next pass.
 */
export type RealtimeUnsubscribe = () => void;

export function subscribeLeads(
  _onChange: (payload: unknown) => void,
): RealtimeUnsubscribe {
  return () => {};
}

export function subscribeMessages(
  _leadId: string,
  _onChange: (payload: unknown) => void,
): RealtimeUnsubscribe {
  return () => {};
}
