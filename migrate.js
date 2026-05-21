const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to DB');

    // 1. Add activePackageId to Member
    try {
      await client.query('ALTER TABLE "Member" ADD COLUMN "activePackageId" TEXT;');
      console.log('Added activePackageId to Member');
    } catch (e) {
      console.log('activePackageId might already exist:', e.message);
    }

    // 2. Add foreign key for activePackageId (optional but good)
    try {
      await client.query('ALTER TABLE "Member" ADD CONSTRAINT "Member_activePackageId_fkey" FOREIGN KEY ("activePackageId") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;');
      console.log('Added foreign key for activePackageId');
    } catch (e) {
      console.log('FK might already exist:', e.message);
    }

    // 3. Drop Invoice table
    try {
      await client.query('DROP TABLE "Invoice";');
      console.log('Dropped Invoice table');
    } catch (e) {
      console.log('Invoice table might not exist:', e.message);
    }

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

migrate();
