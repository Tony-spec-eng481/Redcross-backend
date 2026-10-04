import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

const client = new Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com',
  port: 5432,
  user: 'postgres.yqvzoenlihgutjwujecq',
  password: 'Learn2026more.',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to DB!');

  await client.query(`ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General'`);
  console.log('Added category column');

  const res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'gallery' AND table_schema = 'public' ORDER BY ordinal_position`);
  console.log('Gallery columns:', res.rows.map(r => r.column_name));

  await client.end();
  console.log('Done!');
}

run().catch(e => { console.error(e); process.exit(1); });
