import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { BOOTSTRAP_SQL } from "./bootstrap";

type DB = ReturnType<typeof drizzlePg<typeof schema>>;

// DATABASE_URL이 있으면 PostgreSQL(Supabase·Neon 등), 없으면 내장 PGlite 파일 DB.
// 개발 서버의 핫 리로드에도 연결이 하나만 유지되도록 globalThis에 보관한다.
const g = globalThis as unknown as { __db?: Promise<DB> };

async function create(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const client = postgres(url, { prepare: false, max: 5 });
    await client.unsafe(BOOTSTRAP_SQL);
    return drizzlePg(client, { schema });
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR ?? ".data/pglite";
  if (dir !== "memory") (await import("node:fs")).mkdirSync(dir, { recursive: true });
  const client = dir === "memory" ? new PGlite() : new PGlite(dir);
  await client.exec(BOOTSTRAP_SQL);
  return drizzlePglite(client, { schema }) as unknown as DB;
}

export function getDb(): Promise<DB> {
  if (!g.__db) g.__db = create();
  return g.__db;
}

export function resetDbForTests() {
  g.__db = undefined;
}
