const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to DB');

    // 1. Add subscriptionEnd to Gym
    try {
      await client.query('ALTER TABLE "Gym" ADD COLUMN "subscriptionEnd" TIMESTAMP(3);');
      console.log('Added subscriptionEnd to Gym');
    } catch (e) {
      console.log('subscriptionEnd might already exist:', e.message);
    }

    // 2. Create PlatformFinancialLog table
    try {
      await client.query(`
        CREATE TABLE "PlatformFinancialLog" (
          "id" TEXT NOT NULL,
          "gymId" TEXT NOT NULL,
          "amount" DOUBLE PRECISION NOT NULL,
          "description" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "PlatformFinancialLog_pkey" PRIMARY KEY ("id")
        );
      `);
      console.log('Created PlatformFinancialLog table');

      await client.query(`
        ALTER TABLE "PlatformFinancialLog" ADD CONSTRAINT "PlatformFinancialLog_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      `);
      console.log('Added foreign key for PlatformFinancialLog');
    } catch (e) {
      console.log('PlatformFinancialLog might already exist:', e.message);
    }

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

migrate();
