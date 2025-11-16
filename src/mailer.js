import nodemailer from 'nodemailer';
import { logger } from './logger.js';

function makeTransport() {
  if ((process.env.SMTP_MODE || 'dev') === 'dev') {
    return nodemailer.createTransport({ jsonTransport: true });
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
}

export async function sendMail({ to, subject, html }) {
  const transporter = makeTransport();
  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || 'no-reply@example.edu',
    to, subject, html
  });
  logger.info({ mail: info }, 'email-sent');
  return info;
}
