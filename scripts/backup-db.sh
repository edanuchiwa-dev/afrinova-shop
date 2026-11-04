#!/usr/bin/env bash
set -euo pipefail

# Script de sauvegarde SQLite avec commande .backup ou fallback Node.js
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

mkdir -p "$DIR/data/backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DEST="$DIR/data/backups/store_${TIMESTAMP}.db"

if command -v sqlite3 >/dev/null 2>&1; then
  echo "[BACKUP] Utilisation de sqlite3 CLI (.backup)..."
  sqlite3 "$DIR/data/store.db" ".backup '$DEST'"
  echo "[BACKUP] ✅ Sauvegarde créée : $DEST"
  # Rotation : garder les 7 plus récentes
  cd "$DIR/data/backups"
  ls -t store_*.db 2>/dev/null | tail -n +8 | xargs -r rm -f
  echo "[BACKUP] Rotation effectuée (7 sauvegardes conservées)."
else
  echo "[BACKUP] sqlite3 CLI non détecté, exécution via Node.js..."
  node "$DIR/scripts/backup-db.mjs"
fi
