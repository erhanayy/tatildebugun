import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  conn: Pool | undefined;
};

const isLocalDb =
  process.env.DATABASE_URL?.includes("localhost") ||
  process.env.DATABASE_URL?.includes("127.0.0.1");

const pool =
  globalForDb.conn ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocalDb ? false : { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== "production") globalForDb.conn = pool;

export const db = drizzle(pool, { schema });
