
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

// POST - Start/End phone session
export async function POST_PHONE_SESSION(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, sessionId, unlockCount, notificationCount, appsUsed } = await request.json();

    if (action === 'start') {
      const session = await db.phoneSession.create({
        data: {
          userId: decoded.userId,
          startTime: new Date(),
          unlockCount: 0,
          notificationCount: 0,
          appsUsed: [],
        },
      });

      return NextResponse.json({ success: true, session });
    } else if (action === 'end') {
      if (!sessionId) {
        return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
      }

      const session = await db.phoneSession.findUnique({
        where: { id: sessionId },
      });

      if (!session || session.userId !== decoded.userId) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);

      const updatedSession = await db.phoneSession.update({
        where: { id: sessionId },
        data: {
          endTime,
          duration,
          unlockCount: unlockCount || 0,
          notificationCount: notificationCount || 0,
          appsUsed: appsUsed || [],
        },
      });

      return NextResponse.json({ success: true, session: updatedSession });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Phone session error:', error);
    return NextResponse.json({ error: 'Failed to manage session' }, { status: 500 });
  }
}
// Expose standard Next.js handler
export const POST = POST_PHONE_SESSION;