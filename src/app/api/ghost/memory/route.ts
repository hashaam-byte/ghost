// src/app/api/ghost/memory/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this';

function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

// POST - Store Memory
export async function POST(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { type, key, value, confidence, source } = await request.json();

    if (!type || !key || value === undefined) {
      return NextResponse.json(
        { message: 'type, key, and value are required' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['preference', 'habit', 'boundary', 'trigger', 'fact'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { message: `type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Upsert memory
    const memory = await db.ghostMemory.upsert({
      where: {
        userId_type_key: {
          userId: decoded.userId,
          type,
          key,
        },
      },
      update: {
        value,
        confidence: confidence !== undefined ? confidence : undefined,
        source: source || undefined,
      },
      create: {
        userId: decoded.userId,
        type,
        key,
        value,
        confidence: confidence || 0.8,
        source,
      },
    });

    return NextResponse.json({
      success: true,
      memory,
    });
  } catch (error) {
    console.error('Store memory error:', error);
    return NextResponse.json(
      { message: 'Failed to store memory' },
      { status: 500 }
    );
  }
}

// GET - Retrieve Memories
export async function GET(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const key = searchParams.get('key');

    // Build query
    const where: any = { userId: decoded.userId };
    if (type) where.type = type;
    if (key) where.key = key;

    const memories = await db.ghostMemory.findMany({
      where,
      orderBy: [
        { confidence: 'desc' },
        { updatedAt: 'desc' },
      ],
    });

    // Group by type
    const groupedByType: Record<string, any[]> = {};
    memories.forEach((mem) => {
      if (!groupedByType[mem.type]) {
        groupedByType[mem.type] = [];
      }
      groupedByType[mem.type].push(mem);
    });

    return NextResponse.json({
      memories,
      count: memories.length,
      groupedByType,
    });
  } catch (error) {
    console.error('Get memories error:', error);
    return NextResponse.json(
      { message: 'Failed to get memories' },
      { status: 500 }
    );
  }
}

// PUT - Update Memory Confidence
export async function PUT(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { type, key, confidence } = await request.json();

    if (!type || !key || confidence === undefined) {
      return NextResponse.json(
        { message: 'type, key, and confidence are required' },
        { status: 400 }
      );
    }

    const memory = await db.ghostMemory.update({
      where: {
        userId_type_key: {
          userId: decoded.userId,
          type,
          key,
        },
      },
      data: {
        confidence,
      },
    });

    return NextResponse.json({
      success: true,
      memory,
    });
  } catch (error) {
    console.error('Update memory confidence error:', error);
    return NextResponse.json(
      { message: 'Failed to update memory confidence' },
      { status: 500 }
    );
  }
}

// DELETE - Delete Memory
export async function DELETE(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const key = searchParams.get('key');

    if (!type || !key) {
      return NextResponse.json(
        { message: 'type and key are required' },
        { status: 400 }
      );
    }

    await db.ghostMemory.delete({
      where: {
        userId_type_key: {
          userId: decoded.userId,
          type,
          key,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Memory deleted',
    });
  } catch (error) {
    console.error('Delete memory error:', error);
    return NextResponse.json(
      { message: 'Failed to delete memory' },
      { status: 500 }
    );
  }
}