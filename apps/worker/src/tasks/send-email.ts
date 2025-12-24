import type { Task } from 'graphile-worker';
import { z } from 'zod';

const sendEmailPayloadSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string(),
  from: z.string().email().optional().default('noreply@boris.local'),
});

export const sendEmail: Task = async (payload, helpers) => {
  const result = sendEmailPayloadSchema.safeParse(payload);

  if (!result.success) {
    helpers.logger.error(`Invalid payload: ${result.error.message}`);
    throw new Error(`Invalid send_email payload: ${result.error.message}`);
  }

  const { to, subject, body, from } = result.data;

  helpers.logger.info(`Sending email to ${to}: ${subject}`);

  // TODO: Implement actual email sending
  console.log({ from, to, subject, body });

  helpers.logger.info(`Email sent successfully to ${to}`);
};
