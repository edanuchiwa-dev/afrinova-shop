#!/usr/bin/env node

/**
 * Script de sauvegarde en ligne de la base SQLite (WAL-safe).
 * Utilise l'API native .backup() de better-sqlite3 pour copier la base
 * sans bloquer les lectures ni les écritures en cours.
 * Rotation automatique : conserve les 7 sauvegardes les plus récentes.
 */

import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dbPath = path.join(rootDir, 'data', 'store.db');
const backupsDir = path.join(rootDir, 'data', 'backups');

const MAX_BACKUPS_RETAINED = 7;

async function runBackup() {
  if (!existsSync(dbPath)) {
    console.error(`[BACKUP] Erreur : fichier introuvable à ${dbPath}`);
    process.exit(1);
  }

  mkdirSync(backupsDir, { recursive: true });

  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
  const destFile = `store_${timestamp}.db`;
  const destPath = path.join(backupsDir, destFile);

  console.log(`[BACKUP] Démarrage de la sauvegarde vers ${destFile}...`);

  const db = new Database(dbPath, { readonly: true });

  try {
    await db.backup(destPath);
    console.log('[BACKUP] ✅ Sauvegarde terminée avec succès.');

    const stats = statSync(destPath);
    console.log(`[BACKUP] Fichier créé : ${destFile} (${(stats.size / 1024).toFixed(2)} Ko)`);

    // Rotation des sauvegardes : suppression des anciennes au-delà de MAX_BACKUPS_RETAINED
    const files = readdirSync(backupsDir)
      .filter((name) => name.startsWith('store_') && name.endsWith('.db'))
      .map((name) => {
        const full = path.join(backupsDir, name);
        return { name, path: full, mtime: statSync(full).mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime); // Du plus récent au plus ancien

    if (files.length > MAX_BACKUPS_RETAINED) {
      const toRemove = files.slice(MAX_BACKUPS_RETAINED);
      for (const item of toRemove) {
        unlinkSync(item.path);
        console.log(`[ROTATION] 🗑️ Ancienne sauvegarde supprimée : ${item.name}`);
      }
    }

    console.log(`[BACKUP] ${Math.min(files.length, MAX_BACKUPS_RETAINED)} sauvegarde(s) conservée(s) dans ${backupsDir}`);
  } catch (err) {
    console.error('[BACKUP] ❌ Échec de la sauvegarde :', err);
    process.exit(1);
  } finally {
    db.close();
  }
}

void runBackup();
