import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this';

export async function GET(request: NextRequest) {
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

    // Get ghost profile
    const ghostProfile = await db.ghostProfile.findUnique({
      where: { userId: decoded.userId },
    });

    // Get streaks
    const streaks = await db.streak.findMany({
      where: { userId: decoded.userId },
    });

    // Get tasks stats
    const tasks = await db.task.findMany({
      where: { userId: decoded.userId },
    });

    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;

    // Get today's XP
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayXP = await db.xPHistory.findMany({
      where: {
        userId: decoded.userId,
        createdAt: {
          gte: today,
        },
      },
    });

    const todayXPTotal = todayXP.reduce((sum, xp) => sum + xp.amount, 0);

    // Calculate level progress
    const currentXP = ghostProfile?.totalXP || 0;
    const currentLevel = ghostProfile?.level || 1;
    const xpForCurrentLevel = (currentLevel - 1) * 100;
    const xpForNextLevel = currentLevel * 100;
    const xpProgress = currentXP - xpForCurrentLevel;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;
    const progressPercentage = Math.floor((xpProgress / xpNeeded) * 100);

    const stats = {
      ghostProfile: {
        level: currentLevel,
        totalXP: currentXP,
        xpProgress,
        xpNeeded,
        progressPercentage,
        evolutionStage: ghostProfile?.evolutionStage || 1,
      },
      streaks: {
        study: streaks.find(s => s.type === 'study')?.count || 0,
        productivity: streaks.find(s => s.type === 'productivity')?.count || 0,
      },
      tasks: {
        total: tasks.length,
        completed: completedTasks,
        pending: pendingTasks,
      },
      today: {
        xp: todayXPTotal,
        actions: todayXP.length,
      },
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}