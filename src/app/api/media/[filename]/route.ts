import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getUploadedFile } from '@/lib/db';
import { isTursoEnabled, tursoGetUploadedFile } from '@/lib/turso';

export const runtime = 'nodejs';

function getMimeByExtension(ext: string): string {
  switch (ext.toLowerCase()) {
    case '.webp':
      return 'image/webp';
    case '.png':
      return 'image/png';
    case '.svg':
      return 'image/svg+xml';
    case '.gif':
      return 'image/gif';
    case '.avif':
      return 'image/avif';
    case '.jpg':
    case '.jpeg':
    default:
      return 'image/jpeg';
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  const { filename } = await context.params;

  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return NextResponse.json({ error: 'Nom de fichier invalide.' }, { status: 400 });
  }

  const ext = path.extname(filename);
  const fallbackMime = getMimeByExtension(ext);

  // 1. Essai de lecture directe sur disque local (dev local ou cache fichier)
  try {
    const diskPath = path.join(process.cwd(), 'public', 'images', 'uploads', filename);
    const buffer = await readFile(diskPath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': fallbackMime,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    // Si absent du disque (ex: sur Vercel serverless), chercher en base de données
  }

  // 2. Recherche en base de données (Turso Cloud ou SQLite local)
  try {
    let fileRecord: { mime_type: string; data: string; size?: number } | null = null;

    if (isTursoEnabled()) {
      try {
        fileRecord = await tursoGetUploadedFile(filename);
      } catch (tursoErr) {
        console.warn('[Turso Media fetch warning]:', tursoErr);
      }
    }

    if (!fileRecord) {
      try {
        fileRecord = getUploadedFile(filename);
      } catch (dbErr) {
        console.warn('[SQLite Media fetch warning]:', dbErr);
      }
    }

    if (!fileRecord || !fileRecord.data) {
      return NextResponse.json({ error: 'Image introuvable.' }, { status: 404 });
    }

    const buffer = Buffer.from(fileRecord.data, 'base64');
    const mime = fileRecord.mime_type || fallbackMime;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mime,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[API Media Error]:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération de l’image.' }, { status: 500 });
  }
}
