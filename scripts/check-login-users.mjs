import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { getMongoUri, mongoOptions } from './mongo-env.mjs';

const emails = [
  'superadmin@hrms.com',
  'karun@hrms.com',
  'jagadeesh@hrms.com',
  'ravi@hrms.com',
];

async function main() {
  await mongoose.connect(getMongoUri(), mongoOptions);
  const users = await mongoose.connection.collection('users')
    .find({ email: { $in: emails } })
    .project({
      email: 1,
      name: 1,
      role: 1,
      status: 1,
      password: 1,
      loginAttempts: 1,
      lockUntil: 1,
      isFirstLogin: 1,
    })
    .toArray();

  for (const user of users) {
    console.log(JSON.stringify({
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      loginAttempts: user.loginAttempts || 0,
      lockUntil: user.lockUntil || null,
      isFirstLogin: user.isFirstLogin,
      passwordMatchesAdmin123456: await bcrypt.compare('Admin123456', user.password || ''),
      passwordMatchesTest123456: await bcrypt.compare('Test@123456', user.password || ''),
    }, null, 2));
  }

  console.log(`count ${users.length}`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
