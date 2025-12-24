// src/app/api/ghost/suggest/route.ts
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

// Suggestion triggers and thresholds
const TRIGGERS: Record<string, any> = {
  excessive_distraction: {
    threshold: 0.7,
    message: 'You seem distracted. Want to start a 25-minute focus session?',
    action: 'start_focus',
    priority: 'high',
  },
  low_productivity: {
    threshold: 0.5,
    message: 'Your productivity seems low today. Need help getting back on track?',
    action: 'suggest_break',
    priority: 'medium',
  },
  streak_at_risk: {
    threshold: 0.9,
    message: "Don't break your streak! Complete one task to keep it going.",
    action: 'view_tasks',
    priority: 'high',
  },
  screen_time_high: {
    threshold: 0.8,
    message: "You've been on your phone for a while. Time for a break?",
    action: 'suggest_rest',
    priority: 'medium',
  },
  bedtime_reminder: {
    threshold: 1.0,
    message: "It's past your usual sleep time. Want me to enable sleep mode?",
    action: 'enable_sleep',
    priority: 'medium',
  },
  study_time: {
    threshold: 0.8,
    message: "It's your usual study time. Ready to focus?",
    action: 'start_study',
    priority: 'low',
  },
  unfinished_tasks: {
    threshold: 0.75,
    message: 'You have 3 pending tasks. Want to tackle one now?',
    action: 'view_tasks',
    priority: 'medium',
  },
};

// POST - Evaluate Trigger & Generate Suggestion
export async function POST(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { trigger, confidence, context } = await request.json();

    if (!trigger || confidence === undefined) {
      return NextResponse.json(
        { message: 'trigger and confidence are required' },
        { status: 400 }
      );
    }

    const triggerConfig = TRIGGERS[trigger];
    if (!triggerConfig) {
      return NextResponse.json({ message: 'Invalid trigger' }, { status: 400 });
    }

    // Check if confidence meets threshold
    const shouldNotify = confidence >= triggerConfig.threshold;

    if (!shouldNotify) {
      return NextResponse.json({
        shouldNotify: false,
        reason: 'Confidence below threshold',
        threshold: triggerConfig.threshold,
        confidence,
      });
    }

    // Check if user wants suggestions (from ghost profile)
    const ghostProfile = await db.ghostProfile.findUnique({
      where: { userId: decoded.userId },
      select: { personality: true, mode: true },
    });

    // Customize message based on personality
    let message = triggerConfig.message;
    if (ghostProfile?.personality === 'funny') {
      message = customizeForFunny(trigger, triggerConfig.message);
    } else if (ghostProfile?.personality === 'coach') {
      message = customizeForCoach(trigger, triggerConfig.message);
    }

    // Create notification (but don't send immediately)
    const notification = await db.notification.create({
      data: {
        userId: decoded.userId,
        type: 'ghost_suggestion',
        title: '👻 Ghost Suggestion',
        message,
        actionLabel: getActionLabel(triggerConfig.action),
        actionUrl: getActionUrl(triggerConfig.action),
        data: {
          trigger,
          confidence,
          context,
        },
      },
    });

    return NextResponse.json({
      shouldNotify: true,
      message,
      action: triggerConfig.action,
      priority: triggerConfig.priority,
      notificationId: notification.id,
      confidence,
    });
  } catch (error) {
    console.error('Ghost suggest error:', error);
    return NextResponse.json(
      { message: 'Failed to generate suggestion' },
      { status: 500 }
    );
  }
}

// GET - Get Recent Suggestions
export async function GET(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const suggestions = await db.notification.findMany({
      where: {
        userId: decoded.userId,
        type: 'ghost_suggestion',
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      suggestions,
      count: suggestions.length,
    });
  } catch (error) {
    console.error('Get suggestions error:', error);
    return NextResponse.json(
      { message: 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}

// Helper Functions

function customizeForFunny(trigger: string, baseMessage: string): string {
  const funnyMessages: Record<string, string> = {
    excessive_distraction: "Yo, you scrolling like it's a sport 😂 Wanna lock in for 25 mins?",
    low_productivity: "Bro, today ain't it. Need me to slap you back into productivity mode?",
    streak_at_risk: "YO YOUR STREAK!!! 🚨 Do ONE thing rn, I'm begging.",
    screen_time_high: 'Your thumbs tired yet? 😭 Take a break fr.',
    bedtime_reminder: 'Sleep??? Never heard of her. Jk go to bed.',
  };
  return funnyMessages[trigger] || baseMessage;
}

function customizeForCoach(trigger: string, baseMessage: string): string {
  const coachMessages: Record<string, string> = {
    excessive_distraction: "Let's refocus. 25 minutes of deep work—you've got this.",
    low_productivity: "Today's been rough, but you're not done yet. One small win?",
    streak_at_risk: 'Your streak is on the line. Finish strong—one task.',
    screen_time_high: 'Your mind needs rest. Step away for a few minutes.',
    bedtime_reminder: "Recovery starts with sleep. Let's wind down.",
  };
  return coachMessages[trigger] || baseMessage;
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    start_focus: 'Start Focus',
    suggest_break: 'Take Break',
    view_tasks: 'View Tasks',
    suggest_rest: 'Rest',
    enable_sleep: 'Sleep Mode',
    start_study: 'Start Study',
  };
  return labels[action] || 'View';
}

function getActionUrl(action: string): string {
  const urls: Record<string, string> = {
    start_focus: '/focus',
    suggest_break: '/break',
    view_tasks: '/tasks',
    suggest_rest: '/rest',
    enable_sleep: '/sleep',
    start_study: '/study',
  };
  return urls[action] || '/';
}