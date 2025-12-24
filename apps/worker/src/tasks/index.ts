import type { TaskList } from 'graphile-worker';
import { sendEmail } from './send-email.js';

export const tasks: TaskList = {
  send_email: sendEmail,
};
