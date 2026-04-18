import type { HRMessage } from "@/lib/happyrobot/types";

/**
 * One message in the transcript. Distinguished by role + channel.
 */
export function MessageBubble({ message }: { message: HRMessage }) {
  return (
    <div className="rounded-md border border-border bg-background/50 px-3 py-2 text-sm">
      <span className="font-mono text-[10px] text-muted-foreground">
        {message.role}
      </span>
      <p>{message.content}</p>
    </div>
  );
}
