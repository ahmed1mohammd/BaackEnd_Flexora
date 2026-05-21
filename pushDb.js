require('dotenv').config();
const { execSync } = require('child_process');

try {
  // Use DIRECT_URL as DATABASE_URL for prisma db push
  console.log('Running prisma db push with DIRECT_URL...');
  execSync('npx prisma db push', { 
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: process.env.DIRECT_URL }
  });
  console.log('Push successful!');
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
