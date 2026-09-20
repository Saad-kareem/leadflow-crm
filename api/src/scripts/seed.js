import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Lead } from '../models/Lead.js';

/**
 * Creates the admin account and, with `--with-leads`, a set of demo leads.
 *
 * The demo leads are deliberately varied — different budgets, message lengths,
 * sources and statuses — so the dashboard shows a realistic spread of scores
 * rather than ten leads that all land on 60.
 *
 *   npm run seed
 *   npm run seed -- --with-leads
 *   npm run seed -- --with-leads --reset
 */

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const daysAhead = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const demoLeads = [
  {
    name: 'Ayesha Raza',
    email: 'ayesha.raza@northbridge.co',
    phone: '+92 300 1234567',
    service: 'ecommerce',
    budget: '15k-50k',
    message:
      'We run a footwear brand with about 400 SKUs on a very dated Magento 1 store. We need to migrate to Shopify Plus before our spring campaign, so the timeline matters — ideally live by the end of March. Could you send a proposal covering migration, theme build and the first month of support?',
    status: 'qualified',
    source: 'wordpress',
    createdAt: daysAgo(2),
    followUpAt: daysAhead(1),
  },
  {
    name: 'Daniel Okafor',
    email: 'daniel@brightpath.io',
    phone: '+44 7700 900183',
    service: 'seo',
    budget: '5k-15k',
    message:
      'Our company publishes B2B software reviews. Organic traffic has been flat for three quarters and we suspect a technical issue after our last redesign. Looking for a technical audit first, then an ongoing retainer if it goes well. What does your pricing look like?',
    status: 'contacted',
    source: 'wordpress',
    createdAt: daysAgo(4),
    followUpAt: daysAgo(1),
  },
  {
    name: 'Sara Mitchell',
    email: 'sara.mitchell@gmail.com',
    phone: '',
    service: 'web-design',
    budget: 'not-sure',
    message: 'Hi, how much for a website?',
    status: 'new',
    source: 'wordpress',
    createdAt: daysAgo(1),
  },
  {
    name: 'Imran Qureshi',
    email: 'imran.q@meridianhealth.pk',
    phone: '0321 9988776',
    service: 'web-development',
    budget: '50k-plus',
    message:
      'We are a private clinic group opening six new locations this year. We need a patient booking portal that integrates with our existing practice management system, plus a public site for each location. Budget is approved and we would like to start next month. Please send a proposal and some relevant case studies.',
    status: 'new',
    source: 'manual',
    createdAt: daysAgo(0),
    followUpAt: daysAhead(3),
  },
  {
    name: 'Kelly Nguyen',
    email: 'kelly@studioamber.design',
    phone: '+1 415 555 0142',
    service: 'branding',
    budget: '5k-15k',
    message:
      'Our studio is rebranding after a merger. We need a new identity system, and we already have a rough direction from an internal workshop. Looking for a quote for logo, type system and brand guidelines.',
    status: 'won',
    source: 'wordpress',
    createdAt: daysAgo(21),
  },
  {
    name: 'Tom Baker',
    email: 'tombaker94@hotmail.com',
    phone: '',
    service: 'maintenance',
    budget: 'under-1k',
    message: 'need someone to fix my wordpress site its broken',
    status: 'lost',
    source: 'wordpress',
    createdAt: daysAgo(14),
  },
  {
    name: 'Priya Sharma',
    email: 'p.sharma@cadenceanalytics.com',
    phone: '+91 98200 11223',
    service: 'paid-ads',
    budget: '15k-50k',
    message:
      'We need help scaling our Google and LinkedIn ads. Current spend is around $18k a month and our cost per qualified demo has roughly doubled since August. Urgent — our quarter closes in six weeks.',
    status: 'contacted',
    source: 'wordpress',
    createdAt: daysAgo(6),
    followUpAt: daysAgo(3),
  },
  {
    name: 'Marcus Webb',
    email: 'marcus.webb@lanterngroup.com',
    phone: '+44 20 7946 0958',
    service: 'web-development',
    budget: '5k-15k',
    message:
      'We need a marketing site rebuilt in something our team can edit. The current one is a static build and every copy change needs a developer. No hard deadline.',
    status: 'new',
    source: 'manual',
    createdAt: daysAgo(9),
  },
  {
    name: 'Nadia Hassan',
    email: 'nadia@orchardandlee.co.uk',
    phone: '07911 123456',
    service: 'ecommerce',
    budget: '1k-5k',
    message: 'Small homeware shop, looking to add online ordering to our existing site.',
    status: 'qualified',
    source: 'wordpress',
    createdAt: daysAgo(11),
    followUpAt: daysAhead(7),
  },
  {
    name: 'Chris',
    email: 'chris@yahoo.com',
    phone: '',
    service: 'other',
    budget: 'under-1k',
    message: '',
    status: 'lost',
    source: 'wordpress',
    createdAt: daysAgo(18),
  },
];

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

const seedLeads = async () => {
  const count = await Lead.countDocuments();
  if (count > 0) {
    console.log(`[seed] ${count} leads already present, skipping demo leads`);
    return;
  }

  // Saved one at a time rather than with insertMany, so each lead goes through
  // the validation hook that scores it and builds its matching keys.
  for (const { createdAt, ...fields } of demoLeads) {
    const lead = new Lead(fields);
    lead.createdAt = createdAt;
    lead.logActivity(
      'created',
      fields.source === 'wordpress' ? 'Received from the website form' : 'Lead added manually',
      fields.source === 'wordpress' ? 'WordPress' : env.admin.name,
    );
    await lead.save();
  }

  console.log(`[seed] created ${demoLeads.length} demo leads`);
};

const run = async () => {
  const args = process.argv.slice(2);
  await connectDatabase();

  if (args.includes('--reset')) {
    await Lead.deleteMany({});
    console.log('[seed] removed existing leads');
  }

  await seedAdmin();
  if (args.includes('--with-leads')) await seedLeads();

  await disconnectDatabase();
};

run().catch(async (error) => {
  console.error('[seed] failed:', error.message);
  await disconnectDatabase().catch(() => {});
  process.exit(1);
});
