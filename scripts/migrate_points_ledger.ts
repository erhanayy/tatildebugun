import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set!");
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log("🚀 Starting Points Ledger Migration (Section 81)...");
    const sqlPath = path.join(__dirname, "create_points_ledger.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    await client.query("BEGIN;");
    await client.query(sql);
    await client.query("COMMIT;");

    console.log("✅ Points Ledger Migration applied successfully!");

    // Verify table exists
    const checkRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('user_points_ledger', 'value_share_pools');
    `);
    console.log("📊 Created tables:", checkRes.rows.map(r => r.table_name));

    // Verify 2026 pool
    const poolRes = await client.query("SELECT * FROM value_share_pools WHERE year = 2026;");
    console.log("🏆 2026 Pool initialized:", poolRes.rows[0]?.season_title_tr);

  } catch (err) {
    await client.query("ROLLBACK;");
    console.error("❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
