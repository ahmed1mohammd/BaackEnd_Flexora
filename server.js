require('dotenv').config();
const app    = require('./app');
const prisma = require('./prisma/client');
const { startReminderCron } = require('./utils/reminderCron');


const port = process.env.PORT || 3000;

const server = app.listen(port, async () => {
  console.log(`App running on port ${port}...`);
  try {
    await prisma.$connect();
    console.log('Prisma connected to Supabase PostgreSQL');

    // Start daily subscription reminder cron (9:00 AM every day)
    startReminderCron();
  } catch (err) {
    console.error('Failed to connect Prisma:', err);
  }
});


process.on('unhandledRejection', err => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
