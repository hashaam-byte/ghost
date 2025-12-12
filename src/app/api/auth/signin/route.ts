import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    console.log('Sign in attempt for:', email);

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user - ONLY include fields that definitely exist in schema
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        password: true,
        isGuest: true,
        isOnline: true,
        lastSeen: true,
        communityZone: true,
        plan: true,
        planExpiry: true,
        isStudent: true,
        bio: true,
        aestheticScore: true,
        profileTheme: true,
        createdAt: true,
        updatedAt: true,
        // Include ghost profile separately
        ghostProfile: {
          select: {
            id: true,
            personality: true,
            tone: true,
            mode: true,
            voicePack: true,
            evolutionStage: true,
            ghostForm: true,
            totalXP: true,
            level: true,
            xpToNextLevel: true,
            coins: true,
            avatarStyle: true,
            accessories: true,
            currentOutfit: true,
            skinColor: true,
            glowColor: true,
            auraColor: true,
            currentAnimation: true,
            personalityEmoji: true,
            roomTheme: true,
            roomItems: true,
            roomRating: true,
            isRoomPublic: true,
            currentMood: true,
            lastInteraction: true,
            isSleeping: true,
            isFloating: true,
            totalInteractions: true,
            totalChats: true,
            totalCommands: true,
            questsCompleted: true,
            streakDays: true,
            helpfulness: true,
          }
        }
      },
    });

    console.log('User found:', user ? 'Yes' : 'No');

    // Generic error message to prevent user enumeration
    if (!user || !user.password) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    console.log('Password valid:', isValidPassword);

    if (!isValidPassword) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update user status - ONLY update fields that exist in schema
    try {
      await db.user.update({
        where: { id: user.id },
        data: {
          isOnline: true,
          lastSeen: new Date(),
          lastActive: new Date(),
          lastSyncAt: new Date(),
        },
      });
      console.log('User status updated');
    } catch (updateError) {
      console.error('Error updating user status:', updateError);
      // Continue even if update fails
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        username: user.username 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Token generated successfully');

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      user: userWithoutPassword,
      token,
      message: 'Sign in successful',
    });

  } catch (error) {
    // DETAILED ERROR LOGGING
    console.error('Sign in error:', error);
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    // Check for specific Prisma errors
    if (error instanceof Error) {
      // Unknown field error (schema mismatch)
      if (error.message.includes('Unknown field') || error.message.includes('Unknown arg')) {
        console.error('SCHEMA MISMATCH DETECTED:', error.message);
        return NextResponse.json(
          { 
            message: 'Database schema error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
          },
          { status: 500 }
        );
      }

      // Prisma Client not initialized
      if (error.message.includes('PrismaClient')) {
        return NextResponse.json(
          { 
            message: 'Database client error', 
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
          },
          { status: 500 }
        );
      }
      
      // Database connection issues
      if (error.message.includes('connect') || error.message.includes('ECONNREFUSED')) {
        return NextResponse.json(
          { 
            message: 'Cannot connect to database', 
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
          },
          { status: 500 }
        );
      }

      // Return full error in development
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json(
          { 
            message: 'Sign in error', 
            error: error.message,
            stack: error.stack?.split('\n').slice(0, 5).join('\n') // First 5 lines only
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { message: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}