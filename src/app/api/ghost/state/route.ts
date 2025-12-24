// src/app/api/ghost/state/route.ts
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

// POST - Update Ghost State
export async function POST(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { mood, energy, context, expression } = await request.json();

    // Get current ghost profile
    const ghostProfile = await db.ghostProfile.findUnique({
      where: { userId: decoded.userId },
    });

    if (!ghostProfile) {
      return NextResponse.json(
        { message: 'Ghost profile not found' },
        { status: 404 }
      );
    }

    // Update ghost state
    const updateData: any = {
      lastInteraction: new Date(),
    };

    if (mood) updateData.currentMood = mood;
    if (expression) updateData.currentAnimation = expression;

    const updatedGhost = await db.ghostProfile.update({
      where: { userId: decoded.userId },
      data: updateData,
    });

    // Create mood log if significant change
    if (mood && mood !== ghostProfile.currentMood) {
      await db.moodLog.create({
        data: {
          userId: decoded.userId,
          mood,
          energy: Math.round((energy || 0.5) * 10),
          stress: 5,
          notes: context || undefined,
        },
      });
    }

    return NextResponse.json({
      success: true,
      ghost: {
        mood: updatedGhost.currentMood,
        expression: updatedGhost.currentAnimation,
      },
    });
  } catch (error) {
    console.error('Update ghost state error:', error);
    return NextResponse.json(
      { message: 'Failed to update ghost state' },
      { status: 500 }
    );
  }
}

// GET - Retrieve Ghost State
export async function GET(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const ghostProfile = await db.ghostProfile.findUnique({
      where: { userId: decoded.userId },
      select: {
        currentMood: true,
        currentAnimation: true,
        isSleeping: true,
        isFloating: true,
        lastInteraction: true,
        personality: true,
        mode: true,
      },
    });

    if (!ghostProfile) {
      return NextResponse.json(
        { message: 'Ghost profile not found' },
        { status: 404 }
      );
    }

    // Determine if ghost should be sleeping based on time
    const hour = new Date().getHours();
    const shouldSleep = hour >= 23 || hour < 6;

    return NextResponse.json({
      mood: ghostProfile.currentMood,
      expression: ghostProfile.currentAnimation,
      isSleeping: shouldSleep || ghostProfile.isSleeping,
      isFloating: ghostProfile.isFloating,
      personality: ghostProfile.personality,
      mode: ghostProfile.mode,
      lastInteraction: ghostProfile.lastInteraction,
    });
  } catch (error) {
    console.error('Get ghost state error:', error);
    return NextResponse.json(
      { message: 'Failed to get ghost state' },
      { status: 500 }
    );
  }
}

// PUT - Toggle Sleep State
export async function PUT(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { isSleeping } = await request.json();

    const updatedGhost = await db.ghostProfile.update({
      where: { userId: decoded.userId },
      data: {
        isSleeping: isSleeping !== undefined ? isSleeping : undefined,
        currentAnimation: isSleeping ? 'sleep' : 'float',
      },
    });

    return NextResponse.json({
      success: true,
      isSleeping: updatedGhost.isSleeping,
    });
  } catch (error) {
    console.error('Toggle sleep state error:', error);
    return NextResponse.json(
      { message: 'Failed to toggle sleep state' },
      { status: 500 }
    );
  }
}