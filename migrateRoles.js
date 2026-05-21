require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const migrateRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB. Migrating old roles to V2 roles...');

    // Update 'owner' to 'Gym-Owner'
    const ownerResult = await User.updateMany(
      { role: 'owner' },
      { $set: { role: 'Gym-Owner' } },
      { runValidators: false }
    );
    console.log(`Migrated ${ownerResult.modifiedCount} users from 'owner' to 'Gym-Owner'`);

    // Update 'admin' to 'Platform-Owner' just in case there are any leftovers
    const adminResult = await User.updateMany(
      { role: 'admin' },
      { $set: { role: 'Platform-Owner' } },
      { runValidators: false }
    );
    console.log(`Migrated ${adminResult.modifiedCount} users from 'admin' to 'Platform-Owner'`);

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

migrateRoles();
