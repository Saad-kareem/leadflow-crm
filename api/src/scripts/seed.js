import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Lead } from '../models/Lead.js';

/**
 * Creates the admin account the dashboards sign in with.
 *
 * Leads are not seeded. They arrive the way they are meant to — through the
 * WordPress form, or added by hand in the dashboard — so what you see in the
 * CRM is always real data that went through the real validation and scoring
 * path, never a fixture that skipped it.
 *
 *   npm run seed              creates the admin account
 *   npm run seed -- --reset   clears every lead first, then creates the admin
 */

const seedAdmin = async () => {
  if (!env.admin.password) {
    throw new Error('Set ADMIN_PASSWORD in .env before seeding the admin account');
  }

  const existing = await User.findOne({ email: env.admin.email.toLowerCase() });
  if (existing) {
    console.log(`[seed] admin already exists: ${existing.email}`);
    return;
  }

  const user = new User({ name: env.admin.name, email: env.admin.email });
  await user.setPassword(env.admin.password);
  await user.save();
  console.log(`[seed] created admin: ${user.email}`);
};

const run = async () => {
  const args = process.argv.slice(2);
  await connectDatabase();

  // Destructive, so it only ever happens when asked for explicitly.
  if (args.includes('--reset')) {
    const { deletedCount } = await Lead.deleteMany({});
    console.log(`[seed] removed ${deletedCount} lead${deletedCount === 1 ? '' : 's'}`);
  }

  await seedAdmin();

  await disconnectDatabase();
};

run().catch(async (error) => {
  console.error('[seed] failed:', error.message);
  await disconnectDatabase().catch(() => {});
  process.exit(1);
});
