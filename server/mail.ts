import { createTransport } from 'nodemailer';
import type { MailTransport } from '../src/accounts/accounts.ts';

/** The outbound mail adapter: sends through the lab's SMTP server, rejecting
 * when the server does not accept the mail. */
export function smtpTransport(smtpUrl: string, from: string): MailTransport {
  const transport = createTransport(smtpUrl);
  return {
    send: async (mail) => {
      await transport.sendMail({
        from,
        to: [...mail.to],
        subject: mail.subject,
        text: mail.text,
      });
    },
  };
}
