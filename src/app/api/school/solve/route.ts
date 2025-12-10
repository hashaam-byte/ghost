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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const problemText = formData.get('problem') as string | null;
    const subject = formData.get('subject') as string;

    if (!file && !problemText) {
      return NextResponse.json(
        { message: 'No problem provided' },
        { status: 400 }
      );
    }

    // Get user and check limits
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      include: { usageStats: true },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Check daily school scan limit for free users
    if (user.plan === 'free') {
      const stats = user.usageStats;
      if (stats) {
        const lastReset = new Date(stats.lastResetDate);
        const now = new Date();
        const isNewDay = lastReset.getDate() !== now.getDate();

        if (isNewDay) {
          await db.usageStats.update({
            where: { userId: decoded.userId },
            data: {
              schoolScanCount: 0,
              chatCount: 0,
              scanCount: 0,
              lastResetDate: now,
            },
          });
        } else if (stats.schoolScanCount >= 5) {
          return NextResponse.json(
            { message: 'Daily homework limit reached. Upgrade to Pro for unlimited help!' },
            { status: 429 }
          );
        }
      }
    }

    // Extract problem text
    let problem = '';
    if (file) {
      // In production, use OCR (Tesseract.js or Google Vision API)
      // For now, simulate OCR
      problem = `[Extracted from image: ${file.name}]`;
    } else if (problemText) {
      problem = problemText;
    }

    // Get AI solution
    const solution = await ghostAI.solveHomework(problem, subject);

    // Parse solution into structured format
    // AI should return formatted response, but we'll structure it
    const lines = solution.split('\n').filter(line => line.trim());
    
    const structuredSolution = {
      problem: problem,
      subject: subject,
      solution: solution,
      steps: extractSteps(solution),
      explanation: extractExplanation(solution),
    };

    // Update usage stats
    if (user.plan === 'free' && user.usageStats) {
      await db.usageStats.update({
        where: { userId: decoded.userId },
        data: {
          schoolScanCount: { increment: 1 },
        },
      });
    }

    // Award XP
    await db.xPHistory.create({
      data: {
        userId: decoded.userId,
        amount: 10,
        reason: 'homework_completed',
        category: 'school',
      },
    });

    await db.ghostProfile.update({
      where: { userId: decoded.userId },
      data: {
        totalXP: { increment: 10 },
      },
    });

    // Increment study streak
    await updateStudyStreak(decoded.userId);

    return NextResponse.json({
      solution: structuredSolution,
      usage: user.plan === 'free' && user.usageStats 
        ? { current: user.usageStats.schoolScanCount + 1, limit: 5 }
        : null,
    });
  } catch (error) {
    console.error('School solve error:', error);
    return NextResponse.json(
      { message: 'Failed to solve problem' },
      { status: 500 }
    );
  }
}

function extractSteps(solution: string): string[] {
  // Extract numbered steps from AI response
  const stepRegex = /(?:Step \d+:|^\d+\.|^\d+\))([\s\S]*?)(?=Step \d+:|^\d+\.|^\d+\)|$)/gi;
  const matches = solution.match(stepRegex);
  
  if (matches) {
    return matches.map(step => 
      step.replace(/^(?:Step \d+:|\d+\.|\d+\))\s*/, '').trim()
    ).filter(step => step.length > 0);
  }

  // Fallback: split by newlines
  return solution.split('\n')
    .filter(line => line.trim().length > 20)
    .slice(0, 5);
}

function extractExplanation(solution: string): string {
  // Look for explanation section
  const explanationMatch = solution.match(/(?:Explanation:|Why this works:)([\s\S]*?)$/i);
  if (explanationMatch) {
    return explanationMatch[1].trim();
  }

  // Fallback: use last substantial paragraph
  const paragraphs = solution.split('\n\n').filter(p => p.length > 50);
  return paragraphs[paragraphs.length - 1] || 'This solution follows standard mathematical principles for this type of problem.';
}

async function updateStudyStreak(userId: string) {
  const streak = await db.streak.findUnique({
    where: {
      userId_type: {
        userId,
        type: 'study'
      }
    }
  });

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (!streak) {
    await db.streak.create({
      data: {
        userId,
        type: 'study',
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
      // Consecutive day - increment streak
      await db.streak.update({
        where: { id: streak.id },
        data: {
          count: { increment: 1 },
          lastUpdated: now,
        }
      });
    } else {
      // Streak broken - reset
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