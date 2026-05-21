const bcrypt = require('bcryptjs');
const prisma = require('./prisma/client');

async function seed() {
  const email = 'snaptech.team.o@gmail.com';
  const plainPassword = '#sN*aP/tE*cH@1%2%0%5%';
  const hashedPassword = await bcrypt.hash(plainPassword, 12);

  console.log('Seeding Platform Owner...');

  // 1. Create a dummy "Platform" gym if it doesn't exist, since all Users need a gymId
  // Or find the existing one if we already created it.
  let platformGym = await prisma.gym.findFirst({
    where: { email: 'admin@snaptech.com' } // The old dummy gym email
  });

  if (!platformGym) {
    platformGym = await prisma.gym.create({
      data: {
        name: 'SnapTech Platform',
        ownerName: 'SnapTech Admin',
        email: 'admin@snaptech.com',
        status: 'active'
      }
    });
  }

  // 2. Upsert the User
  const adminUser = await prisma.user.upsert({
    where: { email: email },
    update: {
      password: hashedPassword,
      role: 'Platform-Owner',
      gymId: platformGym.id,
      name: 'SnapTech Team'
    },
    create: {
      email: email,
      name: 'SnapTech Team',
      password: hashedPassword,
      role: 'Platform-Owner',
      gymId: platformGym.id
    }
  });

  console.log('✅ Admin user created/updated successfully!');
  console.log('Email:', adminUser.email);
}

seed()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
