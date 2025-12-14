import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this';

function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}
      // GET - Get all available badges
      export async function GET(request: NextRequest) {
        try {
          const decoded = getUserFromToken(request);
          if (!decoded) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
          }
    
          const badges = await db.badge.findMany({
            include: {
              users: {
                where: { userId: decoded.userId },
              },
            },
          });
      
          const badgesWithStatus = badges.map(badge => ({
            ...badge,
            isUnlocked: badge.users.length > 0,
            unlockedAt: badge.users[0]?.earnedAt,
          }));
      
          return NextResponse.json({ success: true, badges: badgesWithStatus });
        } catch (error) {
          console.error('Get badges error:', error);
          return NextResponse.json({ error: 'Failed to fetch badges' }, { status: 500 });
        }
      }
      
      // POST - Check and unlock badge
      export async function POST(request: NextRequest) {
        try {
          const decoded = getUserFromToken(request);
          if (!decoded) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
          }
      
          const { badgeName } = await request.json();
      
          const badge = await db.badge.findUnique({
            where: { name: badgeName },
          });
      
          if (!badge) {
            return NextResponse.json({ error: 'Badge not found' }, { status: 404 });
          }
      
          // Check if already unlocked
          const existing = await db.userBadge.findUnique({
            where: {
              userId_badgeId: {
                userId: decoded.userId,
                badgeId: badge.id,
              },
            },
          });
      
          if (existing) {
            return NextResponse.json({ success: false, message: 'Already unlocked' });
          }
      
          // Check requirements
          const meetsRequirements = await checkBadgeRequirements(decoded.userId, badge);
      
          if (!meetsRequirements) {
            return NextResponse.json({ success: false, message: 'Requirements not met' });
          }
      
          // Unlock badge
          const userBadge = await db.userBadge.create({
            data: {
              userId: decoded.userId,
              badgeId: badge.id,
            },
          });
      
          // Award XP to ghostProfile.totalXP (badge.xpReward may not exist on the generated type)
          const xpReward = Number((badge as any).xpReward ?? 0);
          if (xpReward > 0) {
            await db.ghostProfile.update({
              where: { userId: decoded.userId },
              data: { totalXP: { increment: xpReward } },
            });
            // Optionally record XP history
            await db.xPHistory.create({
              data: {
                userId: decoded.userId,
                amount: xpReward,
                reason: `Unlocked badge: ${badge.name}`,
                category: 'badge',
              },
            });
          }
      
          return NextResponse.json({
            success: true,
            badge: userBadge,
            xpEarned: xpReward,
          });
        } catch (error) {
          console.error('Unlock badge error:', error);
          return NextResponse.json({ error: 'Failed to unlock badge' }, { status: 500 });
        }
      }
      
      async function checkBadgeRequirements(userId: string, badge: any) {
        if (!badge?.requirement) return true;
        const requirement = JSON.parse(badge.requirement);
      
        // Example: { type: "xp", value: 1000 }
        if (requirement.type === 'xp') {
          const gp = await db.ghostProfile.findUnique({ where: { userId } });
          return (gp?.totalXP ?? 0) >= requirement.value;
        }
      
        // Example: { type: "streak", value: 7 }
        if (requirement.type === 'streak') {
          const streak = await db.streak.findFirst({
            where: { userId, count: { gte: requirement.value } },
          });
          return !!streak;
        }
      
        // Example: { type: "tasks_completed", value: 50 }
        if (requirement.type === 'tasks_completed') {
          const count = await db.task.count({
            where: { userId, status: 'completed' },
          });
          return count >= requirement.value;
        }
      
        return false;
      }
    