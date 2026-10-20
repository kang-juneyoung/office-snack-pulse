// 두 드라이버(PGlite, PostgreSQL)에서 그대로 실행되는 스키마.
// schema.ts와 같은 구조를 유지한다. 운영 전환 시 drizzle-kit 마이그레이션으로 바꾼다.
export const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('manager','staff')),
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS surveys (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  headcount INTEGER NOT NULL CHECK (headcount > 0),
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS surveys_token_idx ON surveys(token);
CREATE INDEX IF NOT EXISTS surveys_owner_idx ON surveys(owner_id);
CREATE TABLE IF NOT EXISTS responses (
  id SERIAL PRIMARY KEY,
  survey_id INTEGER NOT NULL REFERENCES surveys(id),
  categories JSONB NOT NULL,
  budget TEXT NOT NULL,
  frequency TEXT NOT NULL,
  comment TEXT,
  client_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS responses_dedupe_idx ON responses(survey_id, client_hash);
CREATE TABLE IF NOT EXISTS quote_requests (
  id SERIAL PRIMARY KEY,
  survey_id INTEGER NOT NULL REFERENCES surveys(id),
  owner_id INTEGER NOT NULL REFERENCES users(id),
  contact_phone TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  anon_id TEXT,
  user_id INTEGER,
  survey_id INTEGER,
  props JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_name_idx ON events(name);
`;
