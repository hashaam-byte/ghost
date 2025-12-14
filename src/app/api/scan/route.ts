import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import { groqAI } from '@/src/lib/groq-ai-client';
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
    const file = formData.get('file') as File;
    const context = formData.get('context') as string;
    const scanType = formData.get('scanType') as string;

    if (!file) {
      return NextResponse.json(
        { message: 'No file provided' },
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

    // Check Pro-only features
    if ((scanType === 'crypto' || scanType === 'social') && user.plan !== 'pro') {
      return NextResponse.json(
        { message: 'This scan type is only available for Ghost Pro members' },
        { status: 403 }
      );
    }

    // Check daily scan limit for free users
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
              scanCount: 0,
              chatCount: 0,
              schoolScanCount: 0,
              lastResetDate: now,
            },
          });
        } else if (stats.scanCount >= 5) {
          return NextResponse.json(
            { message: 'Daily scan limit reached. Upgrade to Pro for unlimited scans!' },
            { status: 429 }
          );
        }
      }
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');

    // Create scan prompt based on type
    let scanPrompt = '';
    switch (scanType) {
      case 'dm':
        scanPrompt = `Analyze this DM/text screenshot. Look for:
1. Tone and intent (friendly, flirty, suspicious, threatening, etc.)
2. Red flags (manipulation, gaslighting, lies, etc.)
3. Hidden meanings or subtext
4. Relationship patterns
5. Recommendations for response

Give your analysis in this JSON format:
{
  "analysis": "detailed analysis here",
  "redFlags": ["flag1", "flag2"],
  "tone": "tone description",
  "recommendation": "what to do",
  "threatLevel": "low|medium|high"
}`;
        break;

      case 'crypto':
        scanPrompt = `Analyze this crypto-related screenshot for scam indicators:
1. Contract address validity
2. Tokenomics red flags
3. Rug pull indicators
4. Team transparency issues
5. Community sentiment
6. Risk score (1-10)

Return JSON:
{
  "analysis": "detailed analysis",
  "redFlags": ["flag1", "flag2"],
  "riskScore": 1-10,
  "recommendation": "what to do",
  "threatLevel": "low|medium|high"
}`;
        break;

      case 'social':
        scanPrompt = `Analyze this social media profile/post:
1. Authenticity indicators
2. Behavioral patterns
3. Engagement quality
4. Red flags or concerns
5. Profile insights

Return JSON:
{
  "analysis": "detailed insights",
  "redFlags": ["any concerns"],
  "authenticity": "high|medium|low",
  "recommendation": "advice",
  "threatLevel": "safe|caution|warning"
}`;
        break;

      default:
        scanPrompt = `Analyze this image/screenshot and provide:
1. What you see
2. Any potential concerns or red flags
3. Context interpretation
4. Recommendations

Return JSON:
{
  "analysis": "what you found",
  "redFlags": ["any issues"],
  "tone": "overall impression",
  "recommendation": "advice",
  "threatLevel": "low|medium|high"
}`;
    }

    // Use Groq Vision to analyze
    const visionAnalysis = await groqAI.analyzeImage(
      base64,
      scanPrompt,
      context || undefined
    );

    // Parse AI response
    let result;
    try {
      // Try to parse as JSON
      const cleaned = visionAnalysis.replace(/```json\n?|\n?```/g, '').trim();
      result = JSON.parse(cleaned);
    } catch {
      // Fallback if not valid JSON
      result = {
        analysis: visionAnalysis,
        redFlags: [],
        tone: 'neutral',
        recommendation: 'Review carefully',
        threatLevel: 'low'
      };
    }

    // Update usage stats
    if (user.plan === 'free' && user.usageStats) {
      await db.usageStats.update({
        where: { userId: decoded.userId },
        data: {
          scanCount: { increment: 1 },
        },
      });
    }

    // Award XP
    await db.xPHistory.create({
      data: {
        userId: decoded.userId,
        amount: 5,
        reason: 'ghost_scan',
        category: 'productivity',
      },
    });

    await db.ghostProfile.update({
      where: { userId: decoded.userId },
      data: {
        totalXP: { increment: 5 },
      },
    });

    // Save scan to database
    await db.scan.create({
      data: {
        userId: decoded.userId,
        scanType,
        description: `${scanType} scan`,
        context: context || '',
        analysis: result.analysis,
        redFlags: result.redFlags || [],
        tone: result.tone,
        recommendation: result.recommendation,
        threatLevel: result.threatLevel || 'low',
        xpAwarded: 5,
      },
    });

    return NextResponse.json({
      result,
      usage: user.plan === 'free' && user.usageStats 
        ? { current: user.usageStats.scanCount + 1, limit: 5 }
        : null,
    });
  } catch (error) {
    console.error('Scan API error:', error);
    return NextResponse.json(
      { message: 'Failed to process scan' },
      { status: 500 }
    );
  }
}