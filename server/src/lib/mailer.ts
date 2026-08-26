import nodemailer, { type Transporter } from 'nodemailer';

import { env } from '../env.ts';
import { logger } from './logger.ts';

/**
 * Outbound email.
 *
 * Three transports, chosen by what is configured:
 *
 *   `resend`  — the Resend HTTP API. Nothing to run, one API key.
 *   `smtp`    — any SMTP server, including a local catcher during development.
 *   `none`    — nothing is configured. Sending does not pretend to succeed: it
 *               returns `SKIPPED`, and every caller reports that honestly rather
 *               than telling a member to check an inbox nothing was sent to.
 *
 * Credentials are read from `env` and never logged. Recipient addresses are logged
 * only in masked form.
 */

export type MailTransport = 'resend' | 'smtp' | 'none';

export type SendResult =
  | { status: 'SENT'; transport: MailTransport; providerId: string | null }
  | { status: 'FAILED'; transport: MailTransport; error: string }
  | { status: 'SKIPPED'; transport: 'none'; error: string };

export type Mail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/** Which transport this deployment will actually use. */
export function activeTransport(): MailTransport {
  if (env.email.resendApiKey) return 'resend';
  if (env.email.smtpHost) return 'smtp';
  return 'none';
}

/** True when a real message can leave the process. */
export const isEmailConfigured = (): boolean => activeTransport() !== 'none';

/** `jason@example.com` → `j***n@example.com`. Used wherever an address is logged. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const head = local.slice(0, 1);
  const tail = local.length > 1 ? local.slice(-1) : '';
  return `${head}***${tail}@${domain}`;
}

let cachedSmtp: Transporter | null = null;

function smtpTransport(): Transporter {
  if (cachedSmtp) return cachedSmtp;
  cachedSmtp = nodemailer.createTransport({
    host: env.email.smtpHost,
    port: env.email.smtpPort,
    // Port 465 is implicit TLS; everything else negotiates STARTTLS.
    secure: env.email.smtpPort === 465,
    auth: env.email.smtpUser
      ? { user: env.email.smtpUser, pass: env.email.smtpPassword }
      : undefined,
  });
  return cachedSmtp;
}

async function sendViaResend(mail: Mail): Promise<SendResult> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.email.resendApiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: `${env.email.fromName} <${env.email.fromAddress}>`,
      to: [mail.to],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      ...(env.email.replyTo ? { reply_to: env.email.replyTo } : {}),
    }),
  });

  const body = (await response.json().catch(() => null)) as
    | { id?: string; message?: string; name?: string }
    | null;

  if (!response.ok) {
    // Resend's own message is safe to keep: it describes the request, not the key.
    return {
      status: 'FAILED',
      transport: 'resend',
      error: body?.message ?? `Resend responded ${response.status}`,
    };
  }

  return { status: 'SENT', transport: 'resend', providerId: body?.id ?? null };
}

async function sendViaSmtp(mail: Mail): Promise<SendResult> {
  const info = await smtpTransport().sendMail({
    from: { name: env.email.fromName, address: env.email.fromAddress },
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    ...(env.email.replyTo ? { replyTo: env.email.replyTo } : {}),
  });
  return { status: 'SENT', transport: 'smtp', providerId: info.messageId ?? null };
}

/**
 * Sends one message.
 *
 * Never throws: a delivery failure is a result, not an exception, because the caller
 * has already committed the account and needs to record what happened either way.
 */
export async function sendMail(mail: Mail): Promise<SendResult> {
  const transport = activeTransport();

  if (transport === 'none') {
    logger.warn('email not sent — no transport configured', {
      to: maskEmail(mail.to),
      subject: mail.subject,
    });
    return {
      status: 'SKIPPED',
      transport: 'none',
      error: 'No email transport configured (set RESEND_API_KEY or SMTP_HOST).',
    };
  }

  try {
    const result = transport === 'resend' ? await sendViaResend(mail) : await sendViaSmtp(mail);
    if (result.status === 'SENT') {
      logger.info('email sent', {
        to: maskEmail(mail.to),
        subject: mail.subject,
        transport: result.transport,
      });
    } else {
      logger.error('email failed', { to: maskEmail(mail.to), error: result.error });
    }
    return result;
  } catch (caught) {
    const error = caught instanceof Error ? caught.message : 'Unknown transport error';
    logger.error('email failed', { to: maskEmail(mail.to), error });
    return { status: 'FAILED', transport, error };
  }
}
