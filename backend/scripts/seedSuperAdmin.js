const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const User = require('../models/User');

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedSuperAdmin = async () => {
  const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || '').toLowerCase();

  if (!SUPER_ADMIN_EMAIL) {
    console.log('⚠️  SUPER_ADMIN_EMAIL not configured in .env');
    return;
  }

  try {
    let user = await User.findOne({ email: SUPER_ADMIN_EMAIL });

    if (user) {
      // Update existing user to superAdmin
      if (user.role !== 'superAdmin' || !user.isApproved) {
        user.role = 'superAdmin';
        user.isApproved = true;
        await user.save();
        console.log(`✅ Updated ${SUPER_ADMIN_EMAIL} to superAdmin`);
      } else {
        console.log(`✅ ${SUPER_ADMIN_EMAIL} is already a superAdmin`);
      }
    } else {
      // Create new superAdmin user with a default password
      const defaultPassword = process.env.SUPER_ADMIN_PASSWORD || 'ChangeMe@123';
      user = await User.create({
        name: 'Super Administrator',
        email: SUPER_ADMIN_EMAIL,
        password: defaultPassword,
        role: 'superAdmin',
        isApproved: true,
      });
      console.log(`✅ Created new superAdmin: ${SUPER_ADMIN_EMAIL}`);
      console.log(`⚠️  Default password: ${defaultPassword} (please change after first login)`);
    }
  } catch (error) {
    console.error('❌ Error seeding superAdmin:', error.message);
  }
};

module.exports = seedSuperAdmin;
