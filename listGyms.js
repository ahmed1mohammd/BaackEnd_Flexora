require('dotenv').config();
const prisma = require('./prisma/client');

async function list() {
  try {
    const gyms = await prisma.gym.findMany({
      include: {
        users: {
          select: {
            email: true,
            role: true
          }
        }
      }
    });
    console.log('--- SYSTEM GYMS LIST ---');
    gyms.forEach(g => {
      console.log(`ID: ${g.id} | Name: ${g.name} | Email: ${g.email} | Status: ${g.status}`);
      console.log('  Users:', g.users.map(u => `${u.email} (${u.role})`).join(', '));
    });
    console.log('------------------------');
    process.exit(0);
  } catch (error) {
    console.error('Error listing gyms:', error);
    process.exit(1);
  }
}

list();
