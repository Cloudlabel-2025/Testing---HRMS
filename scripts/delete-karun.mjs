import mongoose from 'mongoose';
import { getMongoUri, mongoOptions } from './mongo-env.mjs';

const uri = getMongoUri();

async function main() {
  await mongoose.connect(uri, mongoOptions);
  const db = mongoose.connection.db;

  // Delete Karun and other test users
  const r = await db.collection('users').deleteMany({ email: { $in: ['karun@hrms.com', 'jagadeesh@hrms.com', 'ravi@hrms.com'] } });
  console.log('Users deleted:', r.deletedCount);

  // Also clean salary structures that are orphaned
  await db.collection('salarystructures').deleteMany({});
  console.log('Salary structures cleared');

  // Verify
  const remaining = await db.collection('users').find({ email: { $in: ['karun@hrms.com', 'jagadeesh@hrms.com', 'ravi@hrms.com'] } }).toArray();
  console.log('Remaining test users:', remaining.length);

  await mongoose.disconnect();
}

main().catch(console.error);
