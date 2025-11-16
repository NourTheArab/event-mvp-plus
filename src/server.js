import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieSession from 'cookie-session';
import multer from 'multer';
import ical from 'ical-generator';
import path from 'node:path';
import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';
import { requestMagicLink, consumeMagicToken } from './auth.js';

const prisma = new PrismaClient();
const app = express();

const PORT = process.env.PORT || 3000;
const ORIGIN = process.env.APP_ORIGIN || 'http://localhost:5173';

// --- core middleware ---
app.use(cors({ origin: [ORIGIN], credentials: true }));
app.use(express.json());
app.use(
  cookieSession({
    name: 'sess',
    secret: process.env.SESSION_SECRET || 'dev-secret',
    httpOnly: true,
  })
);

// make uploads dir if missing
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// --- file uploads (images only) ---
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /image\/(png|jpe?g)/i.test(file.mimetype);
    cb(ok ? null : new Error('Only JPG/JPEG/PNG allowed'), ok);
  },
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) =>
      cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_')),
  }),
});

// --- auth guards ---
function requireAuth(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: 'auth required' });
  next();
}
function requireRole(...roles) {
  return (req, res, next) => {
    const r = req.session?.user?.role;
    if (!r || !roles.includes(r)) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}
const isAdmin = (u) => u && (u.role === 'admin' || u.role === 'superadmin');

// --- health ---
app.get('/health', (_, res) => res.json({ ok: true }));

// --- magic-link auth ---
app.post('/auth/magic/request', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });
  await requestMagicLink(email, ORIGIN);
  res.json({ ok: true });
});
app.post('/auth/magic/consume', async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'token required' });
  const user = await consumeMagicToken(token);
  if (!user) return res.status(400).json({ error: 'invalid or expired token' });
  req.session.user = { id: user.id, email: user.email, role: user.role, name: user.name };
  res.json({ ok: true, user: req.session.user });
});
app.post('/auth/logout', (req, res) => {
  req.session = null;
  res.json({ ok: true });
});
app.get('/me', (req, res) => res.json({ user: req.session?.user || null }));

// --- Admin: Users (superadmin) ---
app.get('/admin/users', requireAuth, requireRole('superadmin'), async (req, res) => {
  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true, name: true } });
  res.json(users);
});
app.post('/admin/users/role', requireAuth, requireRole('superadmin'), async (req, res) => {
  const { email, role } = req.body || {};
  if (!email || !role) return res.status(400).json({ error: 'email & role required' });
  const user = await prisma.user.upsert({
    where: { email },
    update: { role },
    create: { email, role },
  });
  res.json(user);
});

// --- Admin: Groups (superadmin) ---
app.get('/admin/groups', requireAuth, requireRole('superadmin'), async (req, res) => {
  res.json(await prisma.group.findMany());
});
app.post('/admin/groups', requireAuth, requireRole('superadmin'), async (req, res) => {
  const { name, convenerEmail } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const g = await prisma.group.create({ data: { name, convenerEmail: convenerEmail || null } });
  res.json(g);
});
app.patch('/admin/groups/:id', requireAuth, requireRole('superadmin'), async (req, res) => {
  const g = await prisma.group.update({ where: { id: req.params.id }, data: req.body || {} });
  res.json(g);
});
app.delete('/admin/groups/:id', requireAuth, requireRole('superadmin'), async (req, res) => {
  try {
    await prisma.group.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(409).json({ error: 'group in use' });
  }
});

// --- Admin: Venues (superadmin) ---
app.get('/admin/venues', requireAuth, requireRole('superadmin'), async (req, res) => {
  res.json(await prisma.venue.findMany());
});
app.post('/admin/venues', requireAuth, requireRole('superadmin'), async (req, res) => {
  const { name, capacity } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const v = await prisma.venue.create({ data: { name, capacity: Number(capacity || 0) } });
  res.json(v);
});
app.patch('/admin/venues/:id', requireAuth, requireRole('superadmin'), async (req, res) => {
  const v = await prisma.venue.update({ where: { id: req.params.id }, data: req.body || {} });
  res.json(v);
});
app.delete('/admin/venues/:id', requireAuth, requireRole('superadmin'), async (req, res) => {
  try {
    await prisma.venue.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(409).json({ error: 'venue in use' });
  }
});

// --- Reference data for forms ---
app.get('/ref/groups', requireAuth, async (req, res) => res.json(await prisma.group.findMany()));
app.get('/ref/venues', requireAuth, async (req, res) => res.json(await prisma.venue.findMany()));
app.get('/ref/services', requireAuth, async (req, res) => res.json(await prisma.service.findMany()));

// --- helpers ---
async function hasVenueConflict(venueId, startsAt, endsAt) {
  // overlap: start < otherEnd && end > otherStart
  const overlapping = await prisma.event.findFirst({
    where: {
      venueId,
      status: { in: ['submitted', 'approved'] },
      AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
    },
  });
  return !!overlapping;
}

// --- Events: create -> attachments -> submit ---
app.post('/api/events', requireAuth, async (req, res) => {
  const { title, description, groupId, venueId, startsAt, endsAt, expectedAttendance, services } = req.body || {};
  if (!title || !groupId || !venueId || !startsAt || !endsAt)
    return res.status(400).json({ error: 'missing required fields' });

  const sAt = new Date(startsAt);
  const eAt = new Date(endsAt);
  const conflict = await hasVenueConflict(venueId, sAt, eAt);

  const event = await prisma.event.create({
    data: {
      title,
      description: description || null,
      groupId,
      venueId,
      startsAt: sAt,
      endsAt: eAt,
      expectedAttendance: Number(expectedAttendance || 0),
      status: 'draft',
      conflict,
      createdById: req.session.user.id,
      visibility: 'private',
    },
  });

  if (Array.isArray(services)) {
    for (const s of services) {
      await prisma.eventService.create({
        data: { eventId: event.id, serviceId: s.serviceId, notes: s.notes || null },
      });
    }
  }
  res.status(201).json(event);
});

app.post('/api/events/:id/attachments', requireAuth, upload.array('files', 4), async (req, res) => {
  const { id } = req.params;
  const ev = await prisma.event.findUnique({ where: { id } });
  if (!ev || ev.createdById !== req.session.user.id) return res.status(404).json({ error: 'not found' });

  const recs = [];
  for (const f of req.files) {
    recs.push(
      await prisma.attachment.create({
        data: { eventId: id, filename: f.filename, mime: f.mimetype, sizeBytes: f.size },
      })
    );
  }
  res.json(recs);
});

app.post('/api/events/:id/submit', requireAuth, async (req, res) => {
  const { id } = req.params;
  const ev = await prisma.event.findUnique({ where: { id } });
  if (!ev || ev.createdById !== req.session.user.id) return res.status(404).json({ error: 'not found' });

  const conflict = await hasVenueConflict(ev.venueId, ev.startsAt, ev.endsAt);
  const updated = await prisma.event.update({ where: { id }, data: { status: 'submitted', conflict } });
  res.json(updated);
});

// --- Events: my list / inbox ---
app.get('/api/my/events', requireAuth, async (req, res) => {
  const events = await prisma.event.findMany({
    where: { createdById: req.session.user.id },
    include: { group: true, venue: true, services: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(events);
});

app.get('/api/inbox/submissions', requireAuth, async (req, res) => {
  if (!isAdmin(req.session.user)) return res.status(403).json({ error: 'forbidden' });
  const events = await prisma.event.findMany({
    where: { status: 'submitted' },
    include: { group: true, venue: true, services: { include: { service: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(events);
});

// --- Events: approve/decline, edit, delete ---
app.post('/api/events/:id/decision', requireAuth, async (req, res) => {
  if (!isAdmin(req.session.user)) return res.status(403).json({ error: 'forbidden' });
  const { id } = req.params;
  const { decision } = req.body || {};
  if (!['approved', 'declined'].includes(decision)) return res.status(400).json({ error: 'bad decision' });
  const updated = await prisma.event.update({
    where: { id },
    data: { status: decision, visibility: decision === 'approved' ? 'public' : 'private' },
  });
  res.json(updated);
});

// edit: superadmin/admin OR creator (until approved)
app.patch('/api/events/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const ev = await prisma.event.findUnique({ where: { id } });
  if (!ev) return res.status(404).json({ error: 'not found' });

  const canCreatorEdit = ev.createdById === req.session.user.id && ev.status !== 'approved';
  if (!(isAdmin(req.session.user) || canCreatorEdit))
    return res.status(403).json({ error: 'forbidden' });

  const { title, description, groupId, venueId, startsAt, endsAt, expectedAttendance, visibility } = req.body || {};
  const updated = await prisma.event.update({
    where: { id },
    data: {
      title,
      description,
      groupId,
      venueId,
      startsAt: startsAt ? new Date(startsAt) : undefined,
      endsAt: endsAt ? new Date(endsAt) : undefined,
      expectedAttendance: typeof expectedAttendance === 'number' ? expectedAttendance : undefined,
      visibility,
    },
  });
  res.json(updated);
});

// delete: superadmin/admin OR creator (anytime for admin; creator until approved)
app.delete('/api/events/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const ev = await prisma.event.findUnique({ where: { id } });
  if (!ev) return res.status(404).json({ error: 'not found' });

  const canCreatorDelete = ev.createdById === req.session.user.id && ev.status !== 'approved';
  if (!(isAdmin(req.session.user) || canCreatorDelete))
    return res.status(403).json({ error: 'forbidden' });

  await prisma.attachment.deleteMany({ where: { eventId: id } });
  await prisma.eventService.deleteMany({ where: { eventId: id } });
  await prisma.event.delete({ where: { id } });
  res.json({ ok: true });
});

// --- Approved (still requires auth for now) ---
app.get('/api/events/approved', requireAuth, async (req, res) => {
  const events = await prisma.event.findMany({
    where: { status: 'approved' },
    include: { group: true, venue: true },
    orderBy: { startsAt: 'asc' },
  });
  res.json(events);
});

// --- iCal feed (public) ---
app.get('/cal/approved.ics', async (req, res) => {
  const events = await prisma.event.findMany({
    where: { status: 'approved' },
    include: { group: true, venue: true },
  });
  const cal = ical({ name: 'Student Engagement — Approved Events' });
  for (const e of events) {
    cal.createEvent({
      id: e.id,
      start: e.startsAt,
      end: e.endsAt,
      summary: e.title,
      location: e.venue.name,
      description: [e.group.name, e.description || ''].filter(Boolean).join('\n\n'),
    });
  }
  res.type('text/calendar').send(cal.toString());
});

// --- start ---
app.listen(PORT, () => logger.info(`Server listening on http://localhost:${PORT}`));