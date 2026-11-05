import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { saveUploadedFile } from '@/lib/db';
import { isTursoEnabled, tursoSaveUploadedFile } from '@/lib/turso';

export const runtime = 'nodejs';

// Extensions d'images prises en charge
const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.avif',
  '.gif',
  '.svg',
  '.jfif',
  '.heic',
  '.heif',
]);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 });
    }

    const rawExt = (path.extname(file.name || '') || '').toLowerCase();
    const rawMime = (file.type || '').toLowerCase();

    // Validation du type de fichier souple (par mime ou par extension)
    const isImageMime = rawMime.startsWith('image/');
    const isAllowedExt = ALLOWED_EXTENSIONS.has(rawExt);

    if (!isImageMime && !isAllowedExt) {
      return NextResponse.json(
        { error: 'Le fichier doit être une image valide (JPEG, PNG, WEBP, AVIF, GIF, SVG).' },
        { status: 400 }
      );
    }

    // Limite de taille à 20 Mo (confortable pour les photos smartphone récentes)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "L'image ne doit pas dépasser 20 Mo." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const inputBuffer = Buffer.from(bytes);

    let outputBuffer: Buffer;
    let outputMime = rawMime || 'image/jpeg';
    let outputExt = rawExt || '.jpg';

    // Optimisation et conversion WebP via Sharp (sauf pour SVG)
    if (rawExt === '.svg' || rawMime === 'image/svg+xml') {
      outputBuffer = inputBuffer;
      outputMime = 'image/svg+xml';
      outputExt = '.svg';
    } else {
      try {
        outputBuffer = await sharp(inputBuffer)
          .rotate() // Orientation EXIF automatique pour photos prises sur mobile
          .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85, effort: 4 })
          .toBuffer();
        outputMime = 'image/webp';
        outputExt = '.webp';
      } catch (sharpError) {
        console.warn('[Sharp processing warning]: falling back to original buffer', sharpError);
        outputBuffer = inputBuffer;
      }
    }

    // Nom de fichier propre et unique
    const rawBase = path.basename(file.name || 'image', rawExt);
    const cleanBase = rawBase
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 30)
      .replace(/^-+|-+$/g, '');

    const uniqueName = `${cleanBase || 'produit'}-${Date.now()}${outputExt}`;

    // 1. Persistance en Base de Données (SQLite local + Turso Cloud si configuré)
    // Cela garantit que l'image survit sur Vercel serverless sans besoin de S3 payant
    const base64Data = outputBuffer.toString('base64');
    try {
      saveUploadedFile(uniqueName, outputMime, base64Data, outputBuffer.length);
    } catch (dbErr) {
      console.warn('[SQLite saveUploadedFile warning]:', dbErr);
    }

    if (isTursoEnabled()) {
      try {
        await tursoSaveUploadedFile(uniqueName, outputMime, base64Data, outputBuffer.length);
      } catch (tursoErr) {
        console.warn('[Turso saveUploadedFile warning]:', tursoErr);
      }
    }

    // 2. Persistance optionnelle sur disque local (dev local ou VPS)
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'images', 'uploads');
      await mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, uniqueName);
      await writeFile(filePath, outputBuffer);
    } catch {
      // Ignoré si le filesystem est en lecture seule (comme sur Vercel serverless)
    }

    const publicUrl = `/api/media/${uniqueName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: uniqueName,
      size: outputBuffer.length,
      mime: outputMime,
    });
  } catch (error) {
    console.error('Erreur upload fichier:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de l'enregistrement de l'image." },
      { status: 500 }
    );
  }
}
