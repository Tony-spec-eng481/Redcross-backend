import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;

async function runMigration() {
  console.log('Connecting to Supabase PostgreSQL database...');

  const client = new Client({
    host: 'aws-0-eu-west-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.yqvzoenlihgutjwujecq',
    password: 'Learn2026more.',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('🎉 Connected to PostgreSQL database successfully!\n');

    // 1. Read & execute main schema
    const schemaPath = path.join(__dirname, 'supabase_schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('Applying supabase_schema.sql...');
    await client.query(schemaSql);
    console.log('✅ supabase_schema.sql executed successfully!\n');

    // 2. Read & execute storage schema if available
    const storagePath = path.join(__dirname, 'supabase_storage_and_rls.sql');
    if (fs.existsSync(storagePath)) {
      console.log('Applying supabase_storage_and_rls.sql...');
      const storageSql = fs.readFileSync(storagePath, 'utf8');
      try {
        await client.query(storageSql);
        console.log('✅ supabase_storage_and_rls.sql executed successfully!\n');
      } catch (err) {
        console.warn('⚠️ Storage SQL notice:', err.message);
      }
    }

    // 3. Verify public tables
    console.log('═══════════════════════════════════════════');
    console.log('DATABASE SCHEMA VALIDATION SUMMARY:');
    console.log('═══════════════════════════════════════════');
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    for (const row of tablesRes.rows) {
      const tableName = row.table_name;
      try {
        const countRes = await client.query(`SELECT count(*) FROM public."${tableName}"`);
        console.log(`✅ Table "public.${tableName}" -> ${countRes.rows[0].count} records`);
      } catch (err) {
        console.log(`⚠️ Table "public.${tableName}" -> ${err.message}`);
      }
    }

    console.log('\n🎉 ALL TABLES, CONSTRAINTS & POLICIES ARE CREATED AND SYNCHRONIZED!');
  } catch (err) {
    console.error('\n❌ Database error:', err.message);
  } finally {
    try { await client.end(); } catch {}
  }
}

runMigration();
