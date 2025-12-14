import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import { groqAI } from '@/src/lib/ai-client';
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

    // Gather user data for analysis
    const [ghostProfile, tasks, xpHistory, streaks] = await Promise.all([
      db.ghostProfile.findUnique({
        where: { userId: decoded.userId },
      }),
      db.task.findMany({
        where: { userId: decoded.userId },
        take: 50,
        orderBy: { createdAt: 'desc' },
      }),
      db.xPHistory.findMany({
        where: { userId: decoded.userId },
        take: 100,
        orderBy: { createdAt: 'desc' },
      }),
      db.streak.findMany({
        where: { userId: decoded.userId },
      }),
    ]);

    // Prepare data summary for AI
    const dataSummary = {
      level: ghostProfile?.level || 1,
      totalXP: ghostProfile?.totalXP || 0,
      tasksCompleted: tasks.filter(t => t.status === 'completed').length,
      tasksPending: tasks.filter(t => t.status === 'pending').length,
      activeStreaks: streaks.filter(s => s.count >= 3),
      recentActivities: xpHistory.slice(0, 20).map(xp => ({
        action: xp.reason,
        xp: xp.amount,
        category: xp.category,
      })),
    };

    // Generate AI insights
    const aiPrompt = `Analyze this user's Ghost data and provide 3-5 personalized insights:

User Data:
- Level: ${dataSummary.level}
- Total XP: ${dataSummary.totalXP}
- Tasks Completed: ${dataSummary.tasksCompleted}
- Tasks Pending: ${dataSummary.tasksPending}
- Active Streaks: ${dataSummary.activeStreaks.length}
- Recent Activities: ${JSON.stringify(dataSummary.recentActivities.slice(0, 5))}

Generate insights as a JSON array with this format:
[{
  "type": "behavioral" | "productivity" | "achievement" | "warning" | "recommendation",
  "title": "Short catchy title",
  "content": "Detailed insight (2-3 sentences)",
  "category": "productivity" | "habits" | "social" | "goals",
  "importance": 1-10
}]

Focus on:
1. Patterns in their behavior
2. Areas for improvement
3. Celebrations of achievements
4. Actionable recommendations

Be encouraging, Gen-Z friendly, and specific. Use their actual data.`;

    const aiResponse = await groqAI.chat([
      { role: 'user', content: aiPrompt }
    ], 'productive', 0.7);

    // Parse AI response
    let aiInsights = [];
    try {
      const cleanResponse = aiResponse.message.replace(/```json|```/g, '').trim();
      aiInsights = JSON.parse(cleanResponse);
    } catch (error) {
      console.error('Failed to parse AI insights:', error);
      // Fallback to basic insights
      aiInsights = [];
    }

    return NextResponse.json({ 
      success: true,
      insights: aiInsights,
      message: 'Insights generated successfully'
    });
  } catch (error) {
    console.error('Generate insights error:', error);
    return NextResponse.json(
      { message: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}