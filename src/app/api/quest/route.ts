import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this';

// GET - Get user's quests
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const status = searchParams.get('status') || 'active';

    // Get quests based on filters
    const where: any = { userId: decoded.userId };
    
    if (type !== 'all') {
      where.type = type;
    }
    
    if (status !== 'all') {
      where.status = status;
    }

    const quests = await db.quest.findMany({
      where,
      orderBy: [
        { status: 'asc' }, // Active first
        { createdAt: 'desc' },
      ],
    });

    // Check for expired quests and update
    const now = new Date();
    const expiredQuests = quests.filter(q => 
      q.expiresAt && 
      q.expiresAt < now && 
      q.status === 'active'
    );

    if (expiredQuests.length > 0) {
      await Promise.all(
        expiredQuests.map(q =>
          db.quest.update({
            where: { id: q.id },
            data: { status: 'expired' },
          })
        )
      );
    }

    // Get fresh data
    const updatedQuests = await db.quest.findMany({
      where,
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ quests: updatedQuests });
  } catch (error) {
    console.error('Get quests error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch quests' },
      { status: 500 }
    );
  }
}

// POST - Update quest progress or complete quest
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

    const { questId, progress, action } = await request.json();

    const quest = await db.quest.findFirst({
      where: {
        id: questId,
        userId: decoded.userId,
      },
    });

    if (!quest) {
      return NextResponse.json(
        { message: 'Quest not found' },
        { status: 404 }
      );
    }

    if (quest.status !== 'active') {
      return NextResponse.json(
        { message: 'Quest is not active' },
        { status: 400 }
      );
    }

    let updatedQuest;
    let rewards = null;

    if (action === 'complete' || progress >= quest.target) {
      // Complete quest
      updatedQuest = await db.quest.update({
        where: { id: questId },
        data: {
          status: 'completed',
          progress: quest.target,
          completedAt: new Date(),
        },
      });

      // Award XP
      await db.xPHistory.create({
        data: {
          userId: decoded.userId,
          amount: quest.xpReward,
          reason: `Completed quest: ${quest.title}`,
          category: quest.category,
          questId: quest.id,
        },
      });

      // Update ghost profile
      const ghostProfile = await db.ghostProfile.update({
        where: { userId: decoded.userId },
        data: {
          totalXP: { increment: quest.xpReward },
          coins: { increment: quest.coinReward },
          questsCompleted: { increment: 1 },
        },
      });

      // Check for level up
      const xpNeeded = ghostProfile.level * 100;
      if (ghostProfile.totalXP >= xpNeeded) {
        await db.ghostProfile.update({
          where: { userId: decoded.userId },
          data: {
            level: { increment: 1 },
            xpToNextLevel: (ghostProfile.level + 1) * 100,
          },
        });
      }

      // Award item if any
      if (quest.itemReward) {
        const shopItem = await db.shopItem.findFirst({
          where: { name: quest.itemReward },
        });

        if (shopItem) {
          await db.inventoryItem.create({
            data: {
              userId: decoded.userId,
              itemId: shopItem.id,
            },
          });
        }
      }

      rewards = {
        xp: quest.xpReward,
        coins: quest.coinReward,
        item: quest.itemReward,
      };

      // Update streak if applicable
      if (quest.type === 'daily') {
        await db.streak.upsert({
          where: {
            userId_type: {
              userId: decoded.userId,
              type: 'daily_quest',
            },
          },
          create: {
            userId: decoded.userId,
            type: 'daily_quest',
            count: 1,
            bestStreak: 1,
          },
          update: {
            count: { increment: 1 },
            lastUpdated: new Date(),
            isActive: true,
          },
        });
      }
    } else {
      // Update progress
      updatedQuest = await db.quest.update({
        where: { id: questId },
        data: { progress },
      });
    }

    return NextResponse.json({
      quest: updatedQuest,
      rewards,
      completed: updatedQuest.status === 'completed',
    });
  } catch (error) {
    console.error('Update quest error:', error);
    return NextResponse.json(
      { message: 'Failed to update quest' },
      { status: 500 }
    );
  }
}