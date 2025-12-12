import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this';

// GET - Get leaderboard
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
    const type = searchParams.get('type') || 'xp'; // xp, aesthetic, streak, quest
    const limit = parseInt(searchParams.get('limit') || '50');
    const season = searchParams.get('season');

    // Build leaderboard based on type
    let leaderboard;
    
    switch (type) {
      case 'xp':
        leaderboard = await db.user.findMany({
          take: limit,
          orderBy: {
            ghostProfile: {
              totalXP: 'desc',
            },
          },
          include: {
            ghostProfile: {
              select: {
                totalXP: true,
                level: true,
                evolutionStage: true,
                ghostForm: true,
                avatarStyle: true,
              },
            },
          },
          where: {
            isGuest: false,
          },
        });
        break;

      case 'aesthetic':
        leaderboard = await db.user.findMany({
          take: limit,
          orderBy: {
            aestheticScore: 'desc',
          },
          include: {
            ghostProfile: {
              select: {
                roomTheme: true,
                roomRating: true,
                roomItems: true,
                evolutionStage: true,
              },
            },
          },
          where: {
            isGuest: false,
          },
        });
        break;

      case 'streak':
        leaderboard = await db.user.findMany({
          take: limit,
          orderBy: {
            ghostProfile: {
              streakDays: 'desc',
            },
          },
          include: {
            ghostProfile: {
              select: {
                streakDays: true,
                level: true,
              },
            },
            streaks: {
              where: {
                isActive: true,
              },
            },
          },
          where: {
            isGuest: false,
          },
        });
        break;

      case 'quest':
        leaderboard = await db.user.findMany({
          take: limit,
          orderBy: {
            ghostProfile: {
              questsCompleted: 'desc',
            },
          },
          include: {
            ghostProfile: {
              select: {
                questsCompleted: true,
                level: true,
                totalXP: true,
              },
            },
          },
          where: {
            isGuest: false,
          },
        });
        break;

      default:
        return NextResponse.json(
          { message: 'Invalid leaderboard type' },
          { status: 400 }
        );
    }

    // Find current user's rank
    const allUsers = await db.user.findMany({
      orderBy: {
        ghostProfile: {
          totalXP: 'desc',
        },
      },
      select: {
        id: true,
      },
      where: {
        isGuest: false,
      },
    });

    const userRank = allUsers.findIndex(u => u.id === decoded.userId) + 1;

    // Get current user's data
    const currentUser = await db.user.findUnique({
      where: { id: decoded.userId },
      include: {
        ghostProfile: true,
      },
    });

    // Format leaderboard data
    const formattedLeaderboard = leaderboard.map((user, index) => ({
      rank: index + 1,
      userId: user.id,
      username: user.username || 'Ghost User',
      avatar: user.avatar,
      score: type === 'xp' ? user.ghostProfile?.totalXP :
             type === 'aesthetic' ? user.aestheticScore :
             type === 'streak' ? user.ghostProfile?.streakDays :
             user.ghostProfile?.questsCompleted,
      level: user.ghostProfile?.level || 1,
      ghostProfile: user.ghostProfile,
      isCurrentUser: user.id === decoded.userId,
    }));

    return NextResponse.json({
      leaderboard: formattedLeaderboard,
      currentUser: {
        rank: userRank,
        userId: currentUser?.id,
        username: currentUser?.username,
        avatar: currentUser?.avatar,
        score: type === 'xp' ? currentUser?.ghostProfile?.totalXP :
               type === 'aesthetic' ? currentUser?.aestheticScore :
               type === 'streak' ? currentUser?.ghostProfile?.streakDays :
               currentUser?.ghostProfile?.questsCompleted,
        level: currentUser?.ghostProfile?.level || 1,
        ghostProfile: currentUser?.ghostProfile,
      },
      type,
      total: allUsers.length,
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

// POST - Update leaderboard entry
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

    // Recalculate ranks (run periodically or on-demand)
    const users = await db.user.findMany({
      include: {
        ghostProfile: true,
        streaks: true,
      },
      where: {
        isGuest: false,
      },
    });

    // Calculate XP ranks
    const xpSorted = [...users].sort((a, b) => 
      (b.ghostProfile?.totalXP || 0) - (a.ghostProfile?.totalXP || 0)
    );

    // Calculate aesthetic ranks
    const aestheticSorted = [...users].sort((a, b) => 
      (b.aestheticScore || 0) - (a.aestheticScore || 0)
    );

    // Calculate streak ranks
    const streakSorted = [...users].sort((a, b) => 
      (b.ghostProfile?.streakDays || 0) - (a.ghostProfile?.streakDays || 0)
    );

    // Calculate quest ranks
    const questSorted = [...users].sort((a, b) => 
      (b.ghostProfile?.questsCompleted || 0) - (a.ghostProfile?.questsCompleted || 0)
    );

    // Update leaderboard entries
    await Promise.all(
      users.map(async (user, index) => {
        const xpRank = xpSorted.findIndex(u => u.id === user.id) + 1;
        const aestheticRank = aestheticSorted.findIndex(u => u.id === user.id) + 1;
        const streakRank = streakSorted.findIndex(u => u.id === user.id) + 1;
        const questRank = questSorted.findIndex(u => u.id === user.id) + 1;

        await db.leaderboard.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            xpRank,
            aestheticRank,
            streakRank,
            questRank,
            totalXP: user.ghostProfile?.totalXP || 0,
            level: user.ghostProfile?.level || 1,
            aestheticScore: user.aestheticScore || 0,
            streakDays: user.ghostProfile?.streakDays || 0,
            questsCompleted: user.ghostProfile?.questsCompleted || 0,
          },
          update: {
            xpRank,
            aestheticRank,
            streakRank,
            questRank,
            totalXP: user.ghostProfile?.totalXP || 0,
            level: user.ghostProfile?.level || 1,
            aestheticScore: user.aestheticScore || 0,
            streakDays: user.ghostProfile?.streakDays || 0,
            questsCompleted: user.ghostProfile?.questsCompleted || 0,
          },
        });
      })
    );

    return NextResponse.json({ 
      message: 'Leaderboard updated',
      updated: users.length,
    });
  } catch (error) {
    console.error('Update leaderboard error:', error);
    return NextResponse.json(
      { message: 'Failed to update leaderboard' },
      { status: 500 }
    );
  }
}