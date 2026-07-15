const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ExLMS');
  const users = await User.find({}, 'email role full_name');
  console.log('Users in DB:');
  console.log(JSON.stringify(users, null, 2));
  await mongoose.connection.close();
}
run().catch(console.error);
