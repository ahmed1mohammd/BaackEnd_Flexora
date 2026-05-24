require('dotenv').config();
const prisma = require('./prisma/client');

async function clean() {
  try {
    console.log('Starting cascade deletion of all non-admin gyms...');
    
    // Find all gyms to delete
    const gyms = await prisma.gym.findMany({
      where: {
        NOT: {
          id: '3eb2780a-1227-4e1b-b40b-0499007cbc09'
        }
      }
    });

    console.log(`Found ${gyms.length} gym(s) to delete.`);

    for (const gym of gyms) {
      console.log(`Deleting Gym: ${gym.name} (Email: ${gym.email}, ID: ${gym.id})...`);
      
      // Cascade delete using Prisma
      await prisma.gym.delete({
        where: {
          id: gym.id
        }
      });
      console.log(`Successfully deleted Gym: ${gym.name}`);
    }

    console.log('Database clean-up completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning database:', error);
    process.exit(1);
  }
}

clean();
