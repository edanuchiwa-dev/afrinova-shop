import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error('❌ Erreur: TURSO_DATABASE_URL n\'est pas défini dans l\'environnement.');
  console.log('Usage: TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." node scripts/turso-migrate.mjs');
  process.exit(1);
}

console.log(`🔌 Connexion à Turso sur : ${url}...`);
const client = createClient({ url, authToken });

const seedPath = path.join(process.cwd(), 'turso-seed.sql');
if (!fs.existsSync(seedPath)) {
  console.error(`❌ Fichier ${seedPath} introuvable.`);
  process.exit(1);
}

const sql = fs.readFileSync(seedPath, 'utf8');

// Découpe les commandes SQL séparées par des points-virgules
// en filtrant les transactions et pragma non supportés par le driver HTTP
const statements = sql
  .split(/;\s*$/m)
  .map((s) => s.trim())
  .filter((s) => {
    if (!s) return false;
    const upper = s.toUpperCase();
    if (upper.startsWith('PRAGMA')) return false;
    if (upper.startsWith('BEGIN TRANSACTION')) return false;
    if (upper.startsWith('COMMIT')) return false;
    if (upper.includes('SQLITE_SEQUENCE')) return false;
    return true;
  })
  .map((s) => {
    // Remplacer unistr('...\u000a...') par du texte SQL standard
    return s.replace(/unistr\('((?:[^'\\]|\\.)*)'\)/g, (_, content) => {
      const decoded = content
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/'/g, "''");
      return `'${decoded}'`;
    });
  });

console.log(`📦 Exécution de ${statements.length} instructions SQL sur Turso...`);

let successCount = 0;
for (const stmt of statements) {
  try {
    await client.execute(stmt);
    successCount++;
  } catch (err) {
    // Si la table existe déjà, continuer
    if (err.message && (err.message.includes('already exists') || err.message.includes('UNIQUE constraint failed'))) {
      continue;
    }
    console.warn(`⚠️ Avertissement sur instruction: ${stmt.slice(0, 60)}... -> ${err.message}`);
  }
}

console.log(`✅ Migration Turso terminée avec succès (${successCount}/${statements.length} instructions exécutées) !`);
