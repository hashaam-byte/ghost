// src/app/api/ghost/overlay/route.ts
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

// POST - Save Overlay Settings
export async function POST(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const {
      enabled,
      size,
      snapEdge,
      opacity,
      autoDismissAfter,
      showOnLockScreen,
    } = await request.json();

    const settings = await db.ghostOverlay.upsert({
      where: { userId: decoded.userId },
      update: {
        enabled: enabled !== undefined ? enabled : undefined,
        size: size || undefined,
        snapEdge: snapEdge || undefined,
        opacity: opacity !== undefined ? opacity : undefined,
        autoDismissAfter: autoDismissAfter || undefined,
        showOnLockScreen: showOnLockScreen !== undefined ? showOnLockScreen : undefined,
        lastUsedAt: new Date(),
      },
      create: {
        userId: decoded.userId,
        enabled: enabled !== undefined ? enabled : true,
        size: size || 'mini',
        snapEdge: snapEdge || 'right',
        opacity: opacity !== undefined ? opacity : 0.9,
        autoDismissAfter,
        showOnLockScreen: showOnLockScreen || false,
      },
    });

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Save overlay settings error:', error);
    return NextResponse.json(
      { message: 'Failed to save overlay settings' },
      { status: 500 }
    );
  }
}

// GET - Get Overlay Settings
export async function GET(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const settings = await db.ghostOverlay.findUnique({
      where: { userId: decoded.userId },
    });

    // Return defaults if not found
    if (!settings) {
      return NextResponse.json({
        enabled: true,
        size: 'mini',
        snapEdge: 'right',
        opacity: 0.9,
        autoDismissAfter: null,
        showOnLockScreen: false,
        lastUsedAt: null,
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Get overlay settings error:', error);
    return NextResponse.json(
      { message: 'Failed to get overlay settings' },
      { status: 500 }
    );
  }
}

// PUT - Log Overlay Usage
export async function PUT(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { duration, contextApp, actionTaken } = await request.json();

    if (!duration) {
      return NextResponse.json(
        { message: 'duration is required' },
        { status: 400 }
      );
    }

    // Log usage
    const log = await db.ghostOverlayLog.create({
      data: {
        userId: decoded.userId,
        duration,
        contextApp,
        actionTaken,
      },
    });

    // Update last used timestamp
    await db.ghostOverlay.update({
      where: { userId: decoded.userId },
      data: {
        lastUsedAt: new Date(),
      },
    });

    // Check for excessive usage (battery safety)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayLogs = await db.ghostOverlayLog.findMany({
      where: {
        userId: decoded.userId,
        createdAt: { gte: today },
      },
    });

    const totalDuration = todayLogs.reduce((sum, l) => sum + l.duration, 0);
    const usageCount = todayLogs.length;

    // Warn if excessive (> 2 hours or > 100 uses per day)
    const isExcessive = totalDuration > 7200 || usageCount > 100;

    if (isExcessive) {
      await db.notification.create({
        data: {
          userId: decoded.userId,
          type: 'system',
          title: '⚡ Battery Reminder',
          message: 'Ghost overlay has been active for a while. Consider resting to save battery.',
        },
      });
    }

    return NextResponse.json({
      success: true,
      log,
      stats: {
        todayDuration: totalDuration,
        todayCount: usageCount,
        averageDuration: Math.round(totalDuration / usageCount),
      },
      warning: isExcessive,
    });
  } catch (error) {
    console.error('Log overlay usage error:', error);
    return NextResponse.json(
      { message: 'Failed to log overlay usage' },
      { status: 500 }
    );
  }
}

// DELETE - Get Overlay Stats
export async function DELETE(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await db.ghostOverlayLog.findMany({
      where: {
        userId: decoded.userId,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalDuration = logs.reduce((sum, l) => sum + l.duration, 0);
    const totalUses = logs.length;

    // Group by context app
    const appUsage: Record<string, { count: number; duration: number }> = {};
    logs.forEach((log) => {
      const app = log.contextApp || 'unknown';
      if (!appUsage[app]) {
        appUsage[app] = { count: 0, duration: 0 };
      }
      appUsage[app].count++;
      appUsage[app].duration += log.duration;
    });

    const topApps = Object.entries(appUsage)
      .map(([app, stats]) => ({ app, ...stats }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);

    return NextResponse.json({
      period: `${days} days`,
      totalDuration,
      totalUses,
      averageDuration: totalUses > 0 ? Math.round(totalDuration / totalUses) : 0,
      topApps,
    });
  } catch (error) {
    console.error('Get overlay stats error:', error);
    return NextResponse.json(
      { message: 'Failed to get overlay stats' },
      { status: 500 }
    );
  }
}