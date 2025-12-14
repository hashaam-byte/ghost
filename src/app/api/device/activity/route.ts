
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

// POST - Log device activity
export async function POST(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      totalScreenTime,
      productiveTime,
      distractionTime,
      unlockCount,
      notificationCount,
    } = await request.json();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Upsert today's activity
    const activity = await db.deviceActivity.upsert({
      where: {
        userId_date: {
          userId: decoded.userId,
          date: today,
        },
      },
      update: {
        totalScreenTime: { increment: totalScreenTime || 0 },
        productiveTime: { increment: productiveTime || 0 },
        distractionTime: { increment: distractionTime || 0 },
        unlockCount: { increment: unlockCount || 0 },
        notificationCount: { increment: notificationCount || 0 },
      },
      create: {
        userId: decoded.userId,
        date: today,
        totalScreenTime: totalScreenTime || 0,
        productiveTime: productiveTime || 0,
        distractionTime: distractionTime || 0,
        unlockCount: unlockCount || 0,
        notificationCount: notificationCount || 0,
      },
    });

    return NextResponse.json({ success: true, activity });
  } catch (error) {
    console.error('Device activity error:', error);
    return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 });
  }
}

// GET - Get device activity history
export async function GET(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const activities = await db.deviceActivity.findMany({
      where: {
        userId: decoded.userId,
        date: { gte: startDate },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ success: true, activities });
  } catch (error) {
    console.error('Get device activity error:', error);
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
  }
}
