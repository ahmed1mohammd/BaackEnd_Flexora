require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('./prisma/client');

const seedAdmin = async () => {
  try {
    const email = 'admin@snaptech.studio';
    
    const existingAdmin = await prisma.user.findUnique({ where: { email } });

    if (existingAdmin) {
      console.log('Admin already exists.');
      process.exit(0);
    }

    let dummyGym = await prisma.gym.findUnique({ where: { email: 'snaptech@snaptech.studio' } });
    if (!dummyGym) {
      dummyGym = await prisma.gym.create({
        data: {
          name: 'SnapTech Platform',
          ownerName: 'Admin',
          email: 'snaptech@snaptech.studio',
          status: 'active'
        }
      });
    }

    const hashedPassword = await bcrypt.hash('admin12345', 12);

    await prisma.user.create({
      data: {
        gymId: dummyGym.id,
        name: 'SnapTech Admin',
        email,
        phoneNumber: '+10000000000',
        password: hashedPassword,
        role: 'Platform-Owner',
      }
    });

    console.log('Admin Platform-Owner created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding admin:', err);
    process.exit(1);
  }
};

seedAdmin();
