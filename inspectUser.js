require('dotenv').config();
const prisma = require('./prisma/client');

async function inspect() {
  try {
    const user = await prisma.user.findFirst({
      where: {
        email: 'capahmed@gmail.com'
      },
      include: {
        gym: true
      }
    });
    console.log('--- USER INSPECTION ---');
    if (user) {
      console.log(`ID: ${user.id}`);
      console.log(`Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`Gym ID: ${user.gymId}`);
      console.log(`Gym Name: ${user.gym?.name}`);
      console.log(`Gym Status: ${user.gym?.status}`);
      console.log(`Gym MaxReceptionists: ${user.gym?.maxReceptionists}`);
      console.log(`Gym MaxCoaches: ${user.gym?.maxCoaches}`);
    } else {
      console.log('User not found.');
    }
    console.log('-----------------------');
    process.exit(0);
  } catch (error) {
    console.error('Error inspecting user:', error);
    process.exit(1);
  }
}

inspect();
