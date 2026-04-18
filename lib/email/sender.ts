import nodemailer, { type Transporter } from "nodemailer";

/**
 * Gmail SMTP sender for the Email Agent branch of the Watcher.
 *
 * Auth: Gmail App Password (16 chars). The user must:
 *   1. Enable 2-Step Verification on the sender account
 *   2. Generate an App Password at https://myaccount.google.com/apppasswords
 *   3. Set GMAIL_APP_PASSWORD in .env.local (spaces are stripped automatically)
 *
 * Env:
 *   EMAIL_AGENT_FROM   = sender address (default: happymultiply@gmail.com)
 *   GMAIL_APP_PASSWORD = the 16-char app password
 */

const FROM = process.env.EMAIL_AGENT_FROM ?? "happymultiply@gmail.com";

let cached: Transporter | null = null;

function transporter(): Transporter {
  if (cached) return cached;
  const pass = (process.env.GMAIL_APP_PASSWORD ?? "").replace(/\s+/g, "");
  if (!pass) {
    throw new Error("GMAIL_APP_PASSWORD is not set in .env.local");
  }
  cached = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: FROM, pass },
  });
  return cached;
}

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

export type SendEmailResult = {
  ok: boolean;
  messageId?: string;
  accepted?: string[];
  rejected?: string[];
  error?: string;
  preview?: string;
};

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  try {
    const t = transporter();
    const info = await t.sendMail({
      from: `Multiply <${FROM}>`,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: input.replyTo,
    });
    return {
      ok: true,
      messageId: info.messageId,
      accepted: info.accepted as string[] | undefined,
      rejected: info.rejected as string[] | undefined,
    };
  } catch (err) {
    return {
      ok: false,
      error: (err as Error).message,
    };
  }
}

export const EMAIL_FROM = FROM;
