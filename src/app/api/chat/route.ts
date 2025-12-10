import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import { ghostAI } from '@/src/lib/ai-client';
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

    const { message, history } = await request.json();

    // Get user and check limits
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      include: { 
        ghostProfile: true,
        usageStats: true 
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Check daily chat limit for free users
    if (user.plan === 'free') {
      const stats = user.usageStats;
      if (stats) {
        // Reset counter if it's a new day
        const lastReset = new Date(stats.lastResetDate);
        const now = new Date();
        const isNewDay = lastReset.getDate() !== now.getDate() || 
                         lastReset.getMonth() !== now.getMonth() ||
                         lastReset.getFullYear() !== now.getFullYear();

        if (isNewDay) {
          await db.usageStats.update({
            where: { userId: decoded.userId },
            data: {
              chatCount: 0,
              scanCount: 0,
              schoolScanCount: 0,
              lastResetDate: now,
            },
          });
        } else if (stats.chatCount >= 50) {
          return NextResponse.json(
            { message: 'Daily chat limit reached. Upgrade to Pro for unlimited chats!' },
            { status: 429 }
          );
        }
      }
    }

    // Prepare messages for AI
    const aiMessages = history.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    aiMessages.push({
      role: 'user',
      content: message,
    });

    // Get AI response
    const personality = user.ghostProfile?.personality || 'chill';
    const response = await ghostAI.chat(aiMessages, personality);

    // Update usage stats
    if (user.plan === 'free' && user.usageStats) {
      await db.usageStats.update({
        where: { userId: decoded.userId },
        data: {
          chatCount: { increment: 1 },
        },
      });
    }

    // Award XP for chatting
    await db.xPHistory.create({
      data: {
        userId: decoded.userId,
        amount: 2,
        reason: 'chat_with_ghost',
        category: 'social',
      },
    });

    await db.ghostProfile.update({
      where: { userId: decoded.userId },
      data: {
        totalXP: { increment: 2 },
      },
    });

    return NextResponse.json({
      message: response.message,
      usage: user.plan === 'free' && user.usageStats 
        ? { current: user.usageStats.chatCount + 1, limit: 50 }
        : null,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { message: 'Failed to process chat' },
      { status: 500 }
    );
  }
}