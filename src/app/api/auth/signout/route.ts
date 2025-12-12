
// ===========================================
// app/api/auth/signout/route.ts - Sign Out
// ===========================================
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this';

export async function POST_SIGNOUT(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Update user status
    await db.user.update({
      where: { id: decoded.userId },
      data: {
        isOnline: false,
        lastSeen: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Signed out successfully',
    });
  } catch (error) {
    console.error('Sign out error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
function getUserFromToken(request: NextRequest): { userId: string } | null {
    type JwtPayload = { userId: string; iat?: number; exp?: number };

    // Try Authorization header first (Bearer TOKEN)
    const authHeader = request.headers.get('authorization') || '';
    let token: string | undefined =
      authHeader && authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7)
        : undefined;

    // Fallback to cookie named 'token'
    if (!token) {
      const cookie = request.cookies.get('token');
      token = cookie?.value;
    }

    if (!token) return null;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload | string;
      if (typeof decoded === 'object' && decoded && 'userId' in decoded) {
        return { userId: String((decoded as JwtPayload).userId) };
      }
      return null;
    } catch (err) {
      console.error('Token verification failed:', err);
      return null;
    }
}

