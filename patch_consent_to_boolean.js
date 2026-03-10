/**
 * ONE-TIME MIGRATION SCRIPT
 * ─────────────────────────
 * Problem: Purane users ke DB mein consent = "demo" (string) hai,
 *          lekin recommendation query consent: true (boolean) check karti thi.
 *
 * Fix: Sab truthy consent strings ko → true (boolean) mein convert karo
 *       Galat / missing consent → false (boolean)
 *
 * Run: node patch_consent_to_boolean.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './.env.local' });

const MONGO_URI = process.env.MONGODB_URL;
const DB_NAME   = 'exhibitor';

// Jo strings consent ke liye "true" mani jaayein
const TRUTHY_VALUES = ['demo', 'yes', 'true', '1', 'agreed', 'accept', 'accepted'];

async function patchConsent() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected.\n');

  const db   = mongoose.connection.useDb(DB_NAME);
  const coll = db.collection('users');

  // ── Step 1: Check current state ────────────────────────────────────────────
  const total          = await coll.countDocuments({});
  const alreadyTrue    = await coll.countDocuments({ consent: true });
  const alreadyFalse   = await coll.countDocuments({ consent: false });
  const stringConsents = await coll.distinct('consent');

  console.log(`📊 Total users     : ${total}`);
  console.log(`✅ consent = true  : ${alreadyTrue}`);
  console.log(`❌ consent = false : ${alreadyFalse}`);
  console.log(`📝 All distinct consent values in DB: ${JSON.stringify(stringConsents)}\n`);

  // ── Step 2: Convert truthy strings → true ──────────────────────────────────
  const trueResult = await coll.updateMany(
    { consent: { $in: TRUTHY_VALUES } },
    { $set: { consent: true } }
  );
  console.log(`✅ Converted truthy strings to boolean true  : ${trueResult.modifiedCount} documents`);

  // ── Step 3: Convert falsy / missing → false ────────────────────────────────
  // Matching: null, undefined, 0, "false", "no", "0", or field missing
  const falseResult = await coll.updateMany(
    {
      $or: [
        { consent: { $exists: false } },
        { consent: null },
        { consent: { $in: ['false', 'no', '0', ''] } },
        { consent: 0 }
      ]
    },
    { $set: { consent: false } }
  );
  console.log(`❌ Converted falsy/missing to boolean false  : ${falseResult.modifiedCount} documents`);

  // ── Step 4: Final verification ─────────────────────────────────────────────
  const finalTrue  = await coll.countDocuments({ consent: true });
  const finalFalse = await coll.countDocuments({ consent: false });
  const remaining  = await coll.distinct('consent');

  console.log('\n📊 After migration:');
  console.log(`   consent = true  : ${finalTrue}`);
  console.log(`   consent = false : ${finalFalse}`);
  console.log(`   Remaining distinct values: ${JSON.stringify(remaining)}`);

  if (remaining.length <= 2) {
    console.log('\n🎉 Migration complete! All consent fields are now proper booleans.');
  } else {
    console.log('\n⚠️  Some unexpected values remain — check them manually:', remaining);
  }

  await mongoose.disconnect();
  console.log('🔌 Disconnected.');
}

patchConsent().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
