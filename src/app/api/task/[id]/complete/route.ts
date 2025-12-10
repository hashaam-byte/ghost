import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const taskId = params.id;

    // Get task
    const task = await db.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json(
        { message: 'Task not found' },
        { status: 404 }
      );
    }

    if (task.userId !== decoded.userId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (task.status === 'completed') {
      return NextResponse.json(
        { message: 'Task already completed' },
        { status: 400 }
      );
    }

    // Update task
    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    // Award XP
    await db.xPHistory.create({
      data: {
        userId: decoded.userId,
        amount: task.xpReward,
        reason: `completed_task_${task.category}`,
        category: 'productivity',
      },
    });

    // Update total XP
    const ghostProfile = await db.ghostProfile.findUnique({
      where: { userId: decoded.userId },
    });

    if (ghostProfile) {
      const newTotalXP = ghostProfile.totalXP + task.xpReward;
      const newLevel = Math.floor(newTotalXP / 100) + 1;

      await db.ghostProfile.update({
        where: { userId: decoded.userId },
        data: {
          totalXP: newTotalXP,
          level: newLevel,
        },
      });
    }

    // Update productivity streak
    await updateProductivityStreak(decoded.userId);

    return NextResponse.json({
      task: updatedTask,
      xpEarned: task.xpReward,
    });
  } catch (error) {
    console.error('Complete task error:', error);
    return NextResponse.json(
      { message: 'Failed to complete task' },
      { status: 500 }
    );
  }
}

async function updateProductivityStreak(userId: string) {
  const streak = await db.streak.findUnique({
    where: {
      userId_type: {
        userId,
        type: 'productivity'
      }
    }
  });

  const now = new Date();

  if (!streak) {
    await db.streak.create({
      data: {
        userId,
        type: 'productivity',
        count: 1,
        lastUpdated: now,
        isActive: true,
      }
    });
  } else {
    const lastUpdate = new Date(streak.lastUpdated);
    const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceUpdate === 0) {
      // Already updated today
      return;
    } else if (daysSinceUpdate === 1) {
      // Consecutive day
      await db.streak.update({
        where: { id: streak.id },
        data: {
          count: { increment: 1 },
          lastUpdated: now,
        }
      });
    } else {
      // Streak broken
      await db.streak.update({
        where: { id: streak.id },
        data: {
          count: 1,
          lastUpdated: now,
        }
      });
    }
  }
}