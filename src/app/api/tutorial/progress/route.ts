// src/app/api/tutorial/progress/route.ts
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

// POST - Update Tutorial Progress
export async function POST(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { stepKey, stepIndex, completed, skipped } = await request.json();

    if (!stepKey || stepIndex === undefined) {
      return NextResponse.json(
        { message: 'stepKey and stepIndex are required' },
        { status: 400 }
      );
    }

    // Update or create tutorial progress
    const progress = await db.tutorialProgress.upsert({
      where: {
        userId_stepKey: {
          userId: decoded.userId,
          stepKey,
        },
      },
      update: {
        completed: completed ?? false,
        skipped: skipped ?? false,
        completedAt: completed ? new Date() : null,
      },
      create: {
        userId: decoded.userId,
        stepKey,
        stepIndex,
        completed: completed ?? false,
        skipped: skipped ?? false,
        completedAt: completed ? new Date() : null,
        xpAwarded: 5,
      },
    });

    // Award XP if completed and not already awarded
    if (completed && !progress.completedAt) {
      await db.xPHistory.create({
        data: {
          userId: decoded.userId,
          amount: 5,
          reason: `Completed tutorial: ${stepKey}`,
          category: 'tutorial',
        },
      });

      await db.ghostProfile.update({
        where: { userId: decoded.userId },
        data: {
          totalXP: { increment: 5 },
        },
      });
    }

    // Get next step
    const allSteps = await db.tutorialProgress.findMany({
      where: { userId: decoded.userId },
      orderBy: { stepIndex: 'asc' },
    });

    const nextIncompleteStep = allSteps.find((s) => !s.completed && !s.skipped);

    return NextResponse.json({
      success: true,
      progress,
      nextStep: nextIncompleteStep?.stepKey || null,
      xpAwarded: completed ? 5 : 0,
      totalCompleted: allSteps.filter((s) => s.completed).length,
    });
  } catch (error) {
    console.error('Tutorial progress error:', error);
    return NextResponse.json(
      { message: 'Failed to update tutorial progress' },
      { status: 500 }
    );
  }
}

// GET - Retrieve Tutorial State
export async function GET(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const allProgress = await db.tutorialProgress.findMany({
      where: { userId: decoded.userId },
      orderBy: { stepIndex: 'asc' },
    });

    const completedSteps = allProgress.filter((s) => s.completed);
    const currentStep = allProgress.find((s) => !s.completed && !s.skipped);

    const totalSteps = 8; // Define based on your tutorial steps
    const isCompleted = completedSteps.length === totalSteps;

    return NextResponse.json({
      currentStep: currentStep?.stepKey || null,
      currentIndex: currentStep?.stepIndex || totalSteps,
      completedSteps: completedSteps.length,
      totalSteps,
      isCompleted,
      progress: allProgress,
    });
  } catch (error) {
    console.error('Get tutorial state error:', error);
    return NextResponse.json(
      { message: 'Failed to get tutorial state' },
      { status: 500 }
    );
  }
}