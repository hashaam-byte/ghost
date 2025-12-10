import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const data = await request.json();
    const {
      personality,
      focusAreas,
      isMorningPerson,
      procrastinates,
      motivationStyle,
      ghostName,
      goalThisMonth,
    } = data;

    // Update ghost profile
    await db.ghostProfile.update({
      where: { userId: decoded.userId },
      data: {
        personality: personality || 'chill',
        mainFocusAreas: focusAreas || [],
        isMorningPerson: isMorningPerson ?? false,
        procrastinates: procrastinates ?? false,
        motivationStyle: motivationStyle || 'positive',
      },
    });

    // Create usage stats
    await db.usageStats.upsert({
      where: { userId: decoded.userId },
      create: {
        userId: decoded.userId,
        chatCount: 0,
        scanCount: 0,
        schoolScanCount: 0,
        lastResetDate: new Date(),
      },
      update: {},
    });

    // Create subscription record
    await db.subscription.upsert({
      where: { userId: decoded.userId },
      create: {
        userId: decoded.userId,
        plan: 'free',
        status: 'active',
      },
      update: {},
    });

    // Add welcome XP
    await db.xPHistory.create({
      data: {
        userId: decoded.userId,
        amount: 50,
        reason: 'completed_onboarding',
        category: 'system',
      },
    });

    await db.ghostProfile.update({
      where: { userId: decoded.userId },
      data: {
        totalXP: 50,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding completion error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}