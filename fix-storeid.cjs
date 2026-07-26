const mongoose = require('mongoose');

const uri = 'mongodb+srv://aashiiraj01_db_user:xI4YmjHl4hTpePPV@cluster0.u7m159h.mongodb.net/?appName=Cluster0';
const REAL_STORE_ID = 'store_1784980062958';

async function main() {
  await mongoose.connect(uri, { dbName: 'test' });
  const db = mongoose.connection.db;

  const before = await db.collection('products').countDocuments({ storeId: 'default-store' });
  console.log('Products to update:', before);

  const result = await db.collection('products').updateMany(
    { storeId: 'default-store' },
    { $set: { storeId: REAL_STORE_ID } }
  );
  console.log('Matched:', result.matchedCount, '| Modified:', result.modifiedCount);

  const remaining = await db.collection('products').countDocuments({ storeId: 'default-store' });
  console.log('Remaining with "default-store":', remaining);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
