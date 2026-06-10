import { Database } from 'bun:sqlite';
import { readdirSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { log } from './logger';
import { enginePath } from './config';

let db: Database;

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

export function initDb(): Database {
  const dataDir = enginePath('data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = resolve(dataDir, 'engine.db');
  const isNew = !existsSync(dbPath);

  db = new Database(dbPath);

  // Performance pragmas
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA synchronous = NORMAL');
  db.run('PRAGMA foreign_keys = ON');
  db.run('PRAGMA busy_timeout = 5000');

  if (isNew) {
    log.info('Created new database', { path: dbPath });
  }

  runMigrations();

  return db;
}

function runMigrations(): void {
  // Create migrations tracking table
  db.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const migrationsDir = enginePath('migrations');
  if (!existsSync(migrationsDir)) {
    log.warn('No migrations directory found', { path: migrationsDir });
    return;
  }

  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const applied = new Set(
    db.query<{ filename: string }, []>('SELECT filename FROM _migrations')
      .all()
      .map(r => r.filename)
  );

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = readFileSync(resolve(migrationsDir, file), 'utf-8');
    log.info('Applying migration', { file });

    db.transaction(() => {
      db.run(sql);
      db.run('INSERT INTO _migrations (filename) VALUES (?)', [file]);
    })();
  }

  if (files.length > 0 && files.some(f => !applied.has(f))) {
    log.info('Migrations complete');
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
    log.info('Database closed');
  }
}
