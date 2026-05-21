require('dotenv').config();
const fs = require('fs');

// The password from the user is: #sN*aP/tE*cH@1%2%0%5%
// Wait, the user wrote: #sN*aP/tE*cH@1%2%0%5%
const password = '#sN*aP/tE*cH@1%2%0%5%';
const encodedPassword = encodeURIComponent(password);

const dbUrl = `postgresql://postgres.gkytgkgbgfsanuxndqki:${encodedPassword}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`;
const directUrl = `postgresql://postgres.gkytgkgbgfsanuxndqki:${encodedPassword}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`;

let envData = fs.readFileSync('.env', 'utf-8');
envData = envData.replace(/DATABASE_URL=".+"/, `DATABASE_URL="${dbUrl}"`);
envData = envData.replace(/DIRECT_URL=".+"/, `DIRECT_URL="${directUrl}"`);

fs.writeFileSync('.env', envData);
console.log('Fixed .env connection strings!');
