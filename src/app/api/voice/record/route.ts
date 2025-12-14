
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this';

function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

// POST - Save voice note
export async function POST(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const duration = parseInt(formData.get('duration') as string);
    const voiceType = formData.get('voiceType') as string || 'original';

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 });
    }

    // In production: upload to S3/Cloudflare R2
    // For now: save metadata only
    const audioUrl = `temp://voice-${Date.now()}.webm`;

    const voiceNote = await db.voiceNote.create({
      data: {
        userId: decoded.userId,
        audioUrl,
        duration,
        voiceType,
        isPublic: false,
      },
    });

    return NextResponse.json({ success: true, voiceNote });
  } catch (error) {
    console.error('Voice note error:', error);
    return NextResponse.json({ error: 'Failed to save voice note' }, { status: 500 });
  }
}

// GET - Get user's voice notes
export async function GET(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const voiceNotes = await db.voiceNote.findMany({
      where: { userId: decoded.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ success: true, voiceNotes });
  } catch (error) {
    console.error('Get voice notes error:', error);
    return NextResponse.json({ error: 'Failed to fetch voice notes' }, { status: 500 });
  }
}
