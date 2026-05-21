require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const fixRole = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB. Fixing role...');
    
    // Find the admin user and update the role to Platform-Owner
    await User.findOneAndUpdate(
      { email: 'admin@snaptech.studio' }, 
      { role: 'Platform-Owner' }
    );
    
    console.log('Admin role successfully updated to Platform-Owner!');
    process.exit(0);
  } catch (err) {
    console.error('Error fixing role:', err);
    process.exit(1);
  }
};

fixRole();
