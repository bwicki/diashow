-- Diashow-API: Schema (in D1 «diashow» bereits angelegt)
CREATE TABLE IF NOT EXISTS config (k TEXT PRIMARY KEY, v TEXT NOT NULL);   -- admin_hash, tok_secret
CREATE TABLE IF NOT EXISTS shares (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, pw_hash TEXT NOT NULL, pw_salt TEXT NOT NULL,
  manifest TEXT, status TEXT NOT NULL DEFAULT 'uploading', n_slides INTEGER DEFAULT 0, bytes INTEGER DEFAULT 0,
  created INTEGER NOT NULL, updated INTEGER NOT NULL, views INTEGER NOT NULL DEFAULT 0, last_view INTEGER
);
CREATE TABLE IF NOT EXISTS views (share_id TEXT NOT NULL, ts INTEGER NOT NULL, completed INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS views_share ON views(share_id, ts);
CREATE TABLE IF NOT EXISTS fails (share_id TEXT NOT NULL, ts INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS fails_share ON fails(share_id, ts);
