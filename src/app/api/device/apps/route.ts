
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

// POST - Log app usage
export async function POST_APP_USAGE(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { appName, packageName, timeSpent, category } = await request.json();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await db.appUsage.upsert({
      where: {
        userId_packageName_date: {
          userId: decoded.userId,
          packageName,
          date: today,
        },
      },
      update: {
        timeSpent: { increment: timeSpent },
        openCount: { increment: 1 },
        lastOpened: new Date(),
      },
      create: {
        userId: decoded.userId,
        date: today,
        appName,
        packageName,
        timeSpent,
        openCount: 1,
        category: category || 'other',
        lastOpened: new Date(),
      },
    });

    return NextResponse.json({ success: true, usage });
  } catch (error) {
    console.error('App usage error:', error);
    return NextResponse.json({ error: 'Failed to log app usage' }, { status: 500 });
  }
}

// GET - Get app usage stats
export async function GET_APP_USAGE(request: NextRequest) {
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

    const usage = await db.appUsage.findMany({
      where: {
        userId: decoded.userId,
        date: { gte: startDate },
      },
      orderBy: { timeSpent: 'desc' },
    });

    // Aggregate by app
    const appStats = usage.reduce((acc: any, curr) => {
      if (!acc[curr.packageName]) {
        acc[curr.packageName] = {
          appName: curr.appName,
          packageName: curr.packageName,
          category: curr.category,
          totalTime: 0,
          totalOpens: 0,
        };
      }
      acc[curr.packageName].totalTime += curr.timeSpent;
      acc[curr.packageName].totalOpens += curr.openCount;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      apps: Object.values(appStats),
    });
  } catch (error) {
    console.error('Get app usage error:', error);
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }
}

// Next.js expects handlers named GET / POST etc. Export delegates so the app-router picks them up.
export const GET = GET_APP_USAGE;
export const POST = POST_APP_USAGE;
