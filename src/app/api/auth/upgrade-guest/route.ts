
// ===========================================
// app/api/auth/upgrade-guest/route.ts - Convert Guest to Real User
// ===========================================
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this';

export async function POST_UPGRADE_GUEST(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { email, username, password } = await request.json();

    // Validate
    if (!email || !password || !username) {
      return NextResponse.json(
        { message: 'Email, username, and password are required' },
        { status: 400 }
      );
    }

    // Check if user is guest
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.isGuest) {
      return NextResponse.json(
        { message: 'Not a guest account' },
        { status: 400 }
      );
    }

    // Check if email/username already exists
    const existing = await db.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() },
        ],
        NOT: {
          id: user.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { message: 'Email or username already taken' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Upgrade account
    const upgradedUser = await db.user.update({
      where: { id: user.id },
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        password: hashedPassword,
        isGuest: false,
      },
      include: {
        ghostProfile: true,
        usageStats: true,
        subscription: true,
      },
    });

    // Update usage limits
    await db.usageStats.update({
      where: { userId: user.id },
      data: {
        chatLimit: 50,
        scanLimit: 10,
        schoolScanLimit: 5,
        voiceNoteLimit: 20,
      },
    });

    // Award upgrade bonus
    await db.xPHistory.create({
      data: {
        userId: user.id,
        amount: 100,
        reason: 'Account upgrade bonus! 🎉',
        category: 'system',
        syncedToServer: true,
      },
    });

    await db.ghostProfile.update({
      where: { userId: user.id },
      data: {
        totalXP: { increment: 100 },
        coins: { increment: 50 },
      },
    });

    // Generate new token
    const token = jwt.sign(
      { 
        userId: upgradedUser.id, 
        email: upgradedUser.email,
        plan: upgradedUser.plan,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const { password: _, ...userWithoutPassword } = upgradedUser;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      token,
      message: 'Account upgraded successfully! 🎉',
    });
  } catch (error) {
    console.error('Upgrade guest error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getUserFromToken(request: NextRequest): { userId: string; email?: string; plan?: string } | null {
    try {
        type TokenPayload = { userId: string; email?: string; plan?: string; iat?: number; exp?: number };

        const authHeader = request.headers.get('authorization') || '';
        const tokenFromHeader = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        const tokenFromCookie = request.cookies.get('token')?.value ?? null;
        const token = tokenFromHeader || tokenFromCookie;

        if (!token) return null;

        const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

        if (!decoded || typeof decoded !== 'object' || !('userId' in decoded)) return null;

        return decoded;
    } catch (error) {
        return null;
    }
}
