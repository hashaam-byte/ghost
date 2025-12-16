// app/api/auth/guest/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this';

export async function POST(request: NextRequest) {
  try {
    // Generate unique guest identifier
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const guestEmail = `${guestId}@ghost.temp`;
    const guestUsername = guestId;

    // Create guest user in transaction
    const user = await db.$transaction(async (tx) => {
      // Create guest user
      const newUser = await tx.user.create({
        data: {
          email: guestEmail,
          username: guestUsername,
          name: `Guest ${guestId.slice(-6)}`, // Short display name
          isGuest: true,
          plan: 'free',
          isOnline: true,
          lastActive: new Date(),
        },
      });

      // Create ghost profile for guest
      await tx.ghostProfile.create({
        data: {
          userId: newUser.id,
          personality: 'chill',
          totalXP: 0,
          level: 1,
          xpToNextLevel: 100,
          coins: 50, // Less coins for guests
          evolutionStage: 1,
          ghostForm: 'baby',
          avatarStyle: 'basic',
          roomTheme: 'default',
          roomItems: [],
          isRoomPublic: false, // Guests' rooms are private by default
          skinColor: '#A020F0',
          glowColor: '#A020F0',
          auraColor: 'pink',
          currentAnimation: 'float',
          personalityEmoji: '👻',
          mainFocusAreas: [],
          timezone: 'Africa/Lagos',
          language: 'en',
          isMorningPerson: false,
          procrastinates: false,
          motivationStyle: 'positive',
          currentMood: 'happy',
          isSleeping: false,
          isFloating: true,
        },
      });

      // Create usage stats with lower limits
      await tx.usageStats.create({
        data: {
          userId: newUser.id,
          chatCount: 0,
          chatLimit: 20, // Lower limit for guests
          scanCount: 0,
          scanLimit: 5,
          schoolScanCount: 0,
          schoolScanLimit: 2,
          voiceNoteCount: 0,
          voiceNoteLimit: 10,
        },
      });

      // Create subscription
      await tx.subscription.create({
        data: {
          userId: newUser.id,
          plan: 'free',
          status: 'active',
        },
      });

      return newUser;
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        isGuest: true,
      },
      JWT_SECRET,
      { expiresIn: '7d' } // Shorter expiry for guests
    );

    // Get complete user data
    const completeUser = await db.user.findUnique({
      where: { id: user.id },
      include: {
        ghostProfile: true,
        usageStats: true,
        subscription: true,
      },
    });

    // Map to Flutter-compatible format
    const mappedUser = {
      ...completeUser!,
      displayName: completeUser!.name,
      xp: completeUser!.ghostProfile?.totalXP || 0,
      level: completeUser!.ghostProfile?.level || 1,
      ghostType: completeUser!.ghostProfile?.ghostForm || 'baby',
      ghostMood: completeUser!.ghostProfile?.currentMood || 'happy',
      ghostColor: completeUser!.ghostProfile?.glowColor || '#8B5CF6',
      voiceTriggerEnabled: true,
      offlineMode: true,
      notificationsEnabled: false, // Disabled for guests
      locationSharingEnabled: false,
      lastActive: completeUser!.lastActive,
      createdAt: completeUser!.createdAt,
      updatedAt: completeUser!.updatedAt,
    };

    return NextResponse.json({
      success: true,
      user: mappedUser,
      token,
      isGuest: true,
      message: 'Guest session started! Sign up to save your progress 👻',
    });
  } catch (error) {
    console.error('Guest sign in error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}