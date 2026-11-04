import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 });
    }

    // Validation du type de fichier
    const mime = file.type || '';
    if (!mime.startsWith('image/')) {
      return NextResponse.json({ error: 'Le fichier doit être une image (JPEG, PNG, WEBP, etc.).' }, { status: 400 });
    }

    // Limite de taille à 10 Mo
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "L'image ne doit pas dépasser 10 Mo." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Préparation du dossier de destination
    const uploadDir = path.join(process.cwd(), 'public', 'images', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    // Génération d'un nom de fichier propre
    const ext = path.extname(file.name) || '.jpg';
    const cleanBase = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 30);
    const uniqueName = `${cleanBase || 'media'}-${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, uniqueName);

    await writeFile(filePath, buffer);

    const publicUrl = `/images/uploads/${uniqueName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: uniqueName,
      size: file.size,
    });
  } catch (error) {
    console.error('Erreur upload fichier:', error);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement de l'image." }, { status: 500 });
  }
}
