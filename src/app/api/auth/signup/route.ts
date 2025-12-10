import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this';

export async function POST(request: NextRequest) {
  try {
    const { email, password, username } = await request.json();

    // Validate input
    if (!email || !password || !username) {
      return NextResponse.json(
        { message: 'Email, password, and username are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { email },
          { username },
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'Email or username already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and ghost profile in a transaction
    const user = await db.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        ghostProfile: {
          create: {
            personality: 'chill',
            tone: 'friendly',
            totalXP: 0,
            level: 1,
            xpToNextLevel: 100,
            evolutionStage: 1,
            avatarStyle: 'basic',
            mainFocusAreas: [],
            timezone: 'Africa/Lagos',
            isMorningPerson: false,
            procrastinates: false,
            motivationStyle: 'positive',
            roomTheme: 'default',
            roomItems: [],
          },
        },
      },
      include: {
        ghostProfile: true,
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data (without password) and token
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      user: userWithoutPassword,
      token,
    }, { status: 201 });
  } catch (error) {
    console.error('Sign up error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}