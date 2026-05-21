require('dotenv').config();
const app = require('./app');
const prisma = require('./prisma/client');

const port = process.env.PORT || 3000;

const server = app.listen(port, async () => {
  console.log(`App running on port ${port}...`);
  try {
    await prisma.$connect();
    console.log('Prisma connected to Supabase PostgreSQL');
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
