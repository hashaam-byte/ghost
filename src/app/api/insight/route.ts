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

    // Get weekly report data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [xpHistory, tasks, streaks] = await Promise.all([
      db.xPHistory.findMany({
        where: {
          userId: decoded.userId,
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      db.task.findMany({
        where: {
          userId: decoded.userId,
          completedAt: { gte: sevenDaysAgo },
        },
      }),
      db.streak.findMany({
        where: { userId: decoded.userId },
      }),
    ]);

    const weeklyReport = {
      xpEarned: xpHistory.reduce((sum, xp) => sum + xp.amount, 0),
      tasksCompleted: tasks.length,
      chats: xpHistory.filter(xp => xp.reason === 'chat_with_ghost').length,
      bestStreak: Math.max(...streaks.map(s => s.count), 0),
      summary: generateWeeklySummary(xpHistory, tasks, streaks),
    };

    // Generate basic insights
    const insights = generateBasicInsights(xpHistory, tasks, streaks);

    return NextResponse.json({ insights, weeklyReport });
  } catch (error) {
    console.error('Get insights error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}

function generateWeeklySummary(xpHistory: any[], tasks: any[], streaks: any[]) {
  const totalXP = xpHistory.reduce((sum, xp) => sum + xp.amount, 0);
  const tasksCompleted = tasks.length;
  const bestStreak = Math.max(...streaks.map(s => s.count), 0);

  if (totalXP === 0 && tasksCompleted === 0) {
    return "You haven't been very active this week. Let's change that! Start with one small task today. 💪";
  }

  if (totalXP > 200) {
    return `Amazing week! You earned ${totalXP} XP and completed ${tasksCompleted} tasks. You're crushing it! Keep this momentum going. 🔥`;
  }

  if (bestStreak >= 7) {
    return `Wow! You've maintained a ${bestStreak}-day streak! That's the kind of consistency that builds real change. Keep it up! 🚀`;
  }

  return `Solid week! You earned ${totalXP} XP. Let's aim even higher next week. Remember: small consistent actions = big results. 💜`;
}

function generateBasicInsights(xpHistory: any[], tasks: any[], streaks: any[]) {
  const insights = [];

  // Productivity insight
  if (tasks.length >= 5) {
    insights.push({
      id: `insight-${Date.now()}-1`,
      type: 'achievement',
      title: 'Productivity Champion! 🏆',
      content: `You completed ${tasks.length} tasks this week! You're building strong habits. Keep up the momentum and watch your life transform.`,
      category: 'productivity',
      importance: 7,
      createdAt: new Date().toISOString(),
    });
  }

  // Streak insight
  const activeStreaks = streaks.filter(s => s.count >= 3);
  if (activeStreaks.length > 0) {
    const bestStreak = activeStreaks.sort((a, b) => b.count - a.count)[0];
    insights.push({
      id: `insight-${Date.now()}-2`,
      type: 'behavioral',
      title: 'Streak Master! 🔥',
      content: `Your ${bestStreak.type} streak is at ${bestStreak.count} days! Streaks are powerful because they build momentum. Don't break it now!`,
      category: 'habits',
      importance: 8,
      createdAt: new Date().toISOString(),
    });
  }

  // Activity insight
  const totalXP = xpHistory.reduce((sum, xp) => sum + xp.amount, 0);
  if (totalXP < 50) {
    insights.push({
      id: `insight-${Date.now()}-3`,
      type: 'warning',
      title: 'Low Activity Detected ⚠️',
      content: `You've only earned ${totalXP} XP this week. Remember: Ghost works best when you use it consistently. Try setting 1-2 small goals today.`,
      category: 'engagement',
      importance: 6,
      createdAt: new Date().toISOString(),
    });
  }

  // Recommendation
  insights.push({
    id: `insight-${Date.now()}-4`,
    type: 'recommendation',
    title: 'Pro Tip: Morning Routine 💡',
    content: `Start your day by checking Ghost. Review your tasks, chat about your goals, and set your intention. Morning momentum = unstoppable day.`,
    category: 'tips',
    importance: 5,
    createdAt: new Date().toISOString(),
  });

  return insights;
}