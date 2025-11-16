import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { sendMail } from './mailer.js';

const prisma = new PrismaClient();

export async function requestMagicLink(email, appOrigin) {
  const token = crypto.randomBytes(24).toString('hex');
  const expires = new Date(Date.now() + 1000 * 60 * 15);
  await prisma.user.upsert({
    where: { email },
    update: { magicToken: token, tokenExpires: expires },
    create: { email, role: 'student', magicToken: token, tokenExpires: expires }
  });
  const link = `${appOrigin}/auth/consume?token=${token}`;
  await sendMail({ to: email, subject: 'Your login link', html: `<p>Click to sign in: <a href="${link}">${link}</a> (valid 15 minutes)</p>` });
  return { ok: true };
}

export async function consumeMagicToken(token) {
  const user = await prisma.user.findFirst({ where: { magicToken: token, tokenExpires: { gt: new Date() } } });
  if (!user) return null;
  await prisma.user.update({ where: { id: user.id }, data: { magicToken: null, tokenExpires: null } });
  return user;
}
