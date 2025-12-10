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

    const { title, description, category, priority, dueDate } = await request.json();

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { message: 'Title is required' },
        { status: 400 }
      );
    }

    // Check task limit for free users
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      include: {
        tasks: {
          where: { status: 'pending' },
        },
      },
    });

    if (user?.plan === 'free') {
      const activeTasks = user.tasks.length;
      if (activeTasks >= 10) {
        return NextResponse.json(
          { message: 'Free users can have max 10 active tasks. Complete some or upgrade to Pro!' },
          { status: 429 }
        );
      }
    }

    // Calculate XP reward based on priority
    const xpRewards: Record<string, number> = {
      low: 5,
      medium: 10,
      high: 20,
    };

    const task = await db.task.create({
      data: {
        userId: decoded.userId,
        title: title.trim(),
        description: description?.trim() || null,
        category: category || 'personal',
        priority: priority || 'medium',
        status: 'pending',
        xpReward: xpRewards[priority] || 10,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json(
      { message: 'Failed to create task' },
      { status: 500 }
    );
  }
}