import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const superadmin = await prisma.user.upsert({
    where: { email: 'njalshe23@earlham.edu' },
    update: { role: 'superadmin', name: 'Nour' },
    create: { email: 'njalshe23@earlham.edu', role: 'superadmin', name: 'Nour' }
  });

  await prisma.user.upsert({
    where: { email: 'student@example.edu' },
    update: { role: 'student', name: 'Sample Student' },
    create: { email: 'student@example.edu', role: 'student', name: 'Sample Student' }
  });

  const groups = await prisma.$transaction([
    prisma.group.upsert({ where: { name: 'Debate Team' }, update: {}, create: { name: 'Debate Team', convenerEmail: 'debate-convener@example.edu' } }),
    prisma.group.upsert({ where: { name: 'Film Club' }, update: {}, create: { name: 'Film Club', convenerEmail: 'film-convener@example.edu' } }),
  ]);

  const venuesData = [
    { name: 'CST', capacity: 120 },
    { name: 'LBC', capacity: 250 },
    { name: 'AWC', capacity: 300 },
    { name: 'Earlham Hall', capacity: 180 },
    { name: 'CVPA', capacity: 200 },
    { name: 'Campus Village', capacity: 90 },
  ];
  const venues = [];
  for (const v of venuesData) {
    const venue = await prisma.venue.upsert({
      where: { name: v.name },
      update: { capacity: v.capacity },
      create: v
    });
    venues.push(venue);
  }

  const av = await prisma.service.upsert({
    where: { key: 'av' },
    update: { name: 'AV Crew', notifyEmail: 'av@av_super_real.com' },
    create: { key: 'av', name: 'AV Crew', notifyEmail: 'av@av_super_real.com' }
  });
  await prisma.service.upsert({
    where: { key: 'facilities' },
    update: { name: 'Facilities', notifyEmail: 'facilities@facilities_super_real.com' },
    create: { key: 'facilities', name: 'Facilities', notifyEmail: 'facilities@facilities_super_real.com' }
  });

  const e1 = await prisma.event.create({
    data: {
      title: 'Sample Film Night',
      description: 'Community film screening.',
      groupId: groups[1].id,
      venueId: venues[0].id,
      startsAt: new Date(Date.now() + 86400000),
      endsAt: new Date(Date.now() + 86400000 + 2 * 3600000),
      expectedAttendance: 60,
      status: 'approved',
      visibility: 'public',
      createdById: superadmin.id
    }
  });
  await prisma.eventService.create({
    data: { eventId: e1.id, serviceId: av.id, notes: 'Projector + mic', notified: true }
  });

  console.log('Seeded with users, groups, venues, services, and one event.');
}

main().finally(() => prisma.$disconnect());
