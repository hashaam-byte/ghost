// app/api/quests/route.ts - Complete Quests System

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

// GET - Get user's quests
export async function GET(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const status = searchParams.get('status') || 'active';

    const where: any = { userId: decoded.userId };
    
    if (type !== 'all') {
      where.type = type;
    }
    
    if (status !== 'all') {
      where.status = status;
    }

    // Get quests
    const quests = await db.quest.findMany({
      where,
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Check and update expired quests
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

    // Get updated quests
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

// POST - Create or update quest progress
export async function POST(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { questId, progress, action, createDaily } = await request.json();

    // Create daily quests if requested
    if (createDaily) {
      return await createDailyQuests(decoded.userId);
    }

    // Update existing quest
    if (!questId) {
      return NextResponse.json(
        { message: 'Quest ID required' },
        { status: 400 }
      );
    }

    const quest = await db.quest.findFirst({
      where: {
        id: questId,
        userId: decoded.userId,
      },
    });

    if (!quest) {
      return NextResponse.json({ message: 'Quest not found' }, { status: 404 });
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
          reason: `Completed: ${quest.title}`,
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
          await db.inventoryItem.upsert({
            where: {
              userId_itemId: {
                userId: decoded.userId,
                itemId: shopItem.id,
              },
            },
            create: {
              userId: decoded.userId,
              itemId: shopItem.id,
            },
            update: {},
          });
        }
      }

      rewards = {
        xp: quest.xpReward,
        coins: quest.coinReward,
        item: quest.itemReward,
      };

      // Update streak
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

// Helper: Create daily quests
async function createDailyQuests(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check if daily quests already created today
  const existingQuests = await db.quest.findMany({
    where: {
      userId,
      type: 'daily',
      createdAt: {
        gte: today,
      },
    },
  });

  if (existingQuests.length > 0) {
    return NextResponse.json({ 
      message: 'Daily quests already created',
      quests: existingQuests 
    });
  }

  // Daily quest templates
  const dailyQuestTemplates = [
    {
      title: 'No Doomscrolling',
      description: "Don't open TikTok or Instagram for 3 hours straight",
      category: 'productivity',
      target: 180, // minutes
      xpReward: 50,
      coinReward: 10,
    },
    {
      title: 'Stay Hydrated',
      description: 'Drink water 5 times today',
      category: 'health',
      target: 5,
      xpReward: 30,
      coinReward: 5,
    },
    {
      title: 'Task Master',
      description: 'Complete 3 tasks from your to-do list',
      category: 'productivity',
      target: 3,
      xpReward: 40,
      coinReward: 8,
    },
    {
      title: 'Early Bird',
      description: 'Wake up before 7 AM',
      category: 'health',
      target: 1,
      xpReward: 60,
      coinReward: 12,
    },
    {
      title: 'Chat with Ghost',
      description: 'Have a conversation with your Ghost',
      category: 'social',
      target: 1,
      xpReward: 20,
      coinReward: 5,
    },
  ];

  // Create random 3 daily quests
  const selectedQuests = dailyQuestTemplates
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const createdQuests = await Promise.all(
    selectedQuests.map(quest =>
      db.quest.create({
        data: {
          userId,
          title: quest.title,
          description: quest.description,
          type: 'daily',
          category: quest.category,
          target: quest.target,
          progress: 0,
          xpReward: quest.xpReward,
          coinReward: quest.coinReward,
          status: 'active',
          expiresAt: tomorrow,
          difficulty: 'easy',
        },
      })
    )
  );

  return NextResponse.json({
    message: 'Daily quests created',
    quests: createdQuests,
  });
}