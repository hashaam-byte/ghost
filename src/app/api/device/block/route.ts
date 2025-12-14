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


// POST - Block/Unblock app
export async function POST_APP_BLOCK(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { packageName, appName, action, blockUntil, reason } = await request.json();

    if (action === 'block') {
      const block = await db.appBlock.upsert({
        where: {
          userId_packageName: {
            userId: decoded.userId,
            packageName,
          },
        },
        update: {
          isBlocked: true,
          blockUntil: blockUntil ? new Date(blockUntil) : null,
          blockReason: reason || 'manual',
        },
        create: {
          userId: decoded.userId,
          packageName,
          appName,
          isBlocked: true,
          blockUntil: blockUntil ? new Date(blockUntil) : null,
          blockReason: reason || 'manual',
        },
      });

      return NextResponse.json({ success: true, block });
    } else if (action === 'unblock') {
      await db.appBlock.update({
        where: {
          userId_packageName: {
            userId: decoded.userId,
            packageName,
          },
        },
        data: { isBlocked: false },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('App block error:', error);
    return NextResponse.json({ error: 'Failed to update block' }, { status: 500 });
  }
}

// GET - Get blocked apps
export async function GET_APP_BLOCKS(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const blocks = await db.appBlock.findMany({
      where: {
        userId: decoded.userId,
        isBlocked: true,
      },
    });

    return NextResponse.json({ success: true, blocks });
  } catch (error) {
    console.error('Get blocks error:', error);
    return NextResponse.json({ error: 'Failed to fetch blocks' }, { status: 500 });
  }
}
