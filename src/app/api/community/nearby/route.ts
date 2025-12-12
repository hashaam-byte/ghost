// app/api/community/nearby/route.ts - Nearby Ghosts System

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

// Calculate distance between two points (Haversine formula)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // Return in meters
}

// GET - Find nearby ghosts
export async function GET(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const radiusKm = parseInt(searchParams.get('radius') || '10');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get current user with location
    const currentUser = await db.user.findUnique({
      where: { id: decoded.userId },
      include: {
        ghostProfile: {
          select: {
            personality: true,
            level: true,
            evolutionStage: true,
            currentMood: true,
            totalXP: true,
          },
        },
      },
    });

    if (!currentUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // User must have location set
    if (!currentUser.latitude || !currentUser.longitude) {
      return NextResponse.json({
        message: 'Location not set',
        nearbyGhosts: [],
      });
    }

    // Find users in the same community zone or nearby
    const nearbyUsers = await db.user.findMany({
      where: {
        AND: [
          { id: { not: decoded.userId } },
          { isGuest: false },
          { isOnline: true },
          {
            OR: [
              { communityZone: currentUser.communityZone },
              {
                AND: [
                  { latitude: { not: null } },
                  { longitude: { not: null } },
                ],
              },
            ],
          },
        ],
      },
      include: {
        ghostProfile: {
          select: {
            personality: true,
            level: true,
            evolutionStage: true,
            currentMood: true,
            ghostForm: true,
            avatarStyle: true,
            totalXP: true,
          },
        },
      },
      take: limit * 2, // Get more to filter by distance
    });

    // Calculate distances and filter
    const nearbyGhosts = nearbyUsers
      .map(user => {
        if (!user.latitude || !user.longitude || !currentUser.latitude || !currentUser.longitude) {
          return null;
        }

        const distance = calculateDistance(
          currentUser.latitude,
          currentUser.longitude,
          user.latitude,
          user.longitude
        );

        // Filter by radius
        if (distance > radiusKm * 1000) {
          return null;
        }

        return {
          userId: user.id,
          username: user.username || 'Ghost User',
          avatar: user.avatar,
          distance: Math.round(distance),
          zone: user.communityZone,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
          ghostProfile: {
            personality: user.ghostProfile?.personality || 'chill',
            level: user.ghostProfile?.level || 1,
            evolutionStage: user.ghostProfile?.evolutionStage || 1,
            mood: user.ghostProfile?.currentMood || 'happy',
            ghostForm: user.ghostProfile?.ghostForm || 'baby',
            totalXP: user.ghostProfile?.totalXP || 0,
          },
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a?.distance || 0) - (b?.distance || 0))
      .slice(0, limit);

    // Update/create nearby ghost records
    for (const ghost of nearbyGhosts) {
      if (!ghost) continue;
      
      await db.nearbyGhost.upsert({
        where: {
          userId_nearbyUserId: {
            userId: decoded.userId,
            nearbyUserId: ghost.userId,
          },
        },
        create: {
          userId: decoded.userId,
          nearbyUserId: ghost.userId,
          distance: ghost.distance,
          zone: ghost.zone || '',
          ghostMood: ghost.ghostProfile.mood,
          canInteract: true,
        },
        update: {
          distance: ghost.distance,
          lastSeen: new Date(),
          ghostMood: ghost.ghostProfile.mood,
        },
      });
    }

    // Get community zone stats
    const zoneStats = await db.user.count({
      where: {
        communityZone: currentUser.communityZone,
        isOnline: true,
      },
    });

    return NextResponse.json({
      nearbyGhosts,
      currentZone: currentUser.communityZone,
      zoneStats: {
        activeGhosts: zoneStats,
        zone: currentUser.communityZone,
      },
    });
  } catch (error) {
    console.error('Get nearby ghosts error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch nearby ghosts' },
      { status: 500 }
    );
  }
}

// POST - Update user location
export async function POST(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { latitude, longitude, zone } = await request.json();

    if (!latitude || !longitude) {
      return NextResponse.json(
        { message: 'Latitude and longitude required' },
        { status: 400 }
      );
    }

    // Determine community zone based on location if not provided
    let communityZone = zone;
    if (!communityZone) {
      // Simple zone detection (you can enhance this with proper geocoding)
      communityZone = `Zone_${Math.floor(latitude)}_${Math.floor(longitude)}`;
    }

    // Update user location
    await db.user.update({
      where: { id: decoded.userId },
      data: {
        latitude,
        longitude,
        communityZone,
        isOnline: true,
        lastSeen: new Date(),
      },
    });

    // Update or create community zone record
    await db.communityZone.upsert({
      where: { name: communityZone },
      create: {
        name: communityZone,
        displayName: communityZone.replace(/_/g, ' '),
        country: 'Unknown',
        centerLat: latitude,
        centerLong: longitude,
        radius: 10,
        activeGhosts: 1,
        totalUsers: 1,
      },
      update: {
        activeGhosts: { increment: 1 },
        totalUsers: { increment: 1 },
      },
    });

    return NextResponse.json({
      message: 'Location updated',
      communityZone,
    });
  } catch (error) {
    console.error('Update location error:', error);
    return NextResponse.json(
      { message: 'Failed to update location' },
      { status: 500 }
    );
  }
}

// PUT - Update online status
export async function PUT(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { isOnline } = await request.json();

    await db.user.update({
      where: { id: decoded.userId },
      data: {
        isOnline: isOnline ?? true,
        lastSeen: new Date(),
      },
    });

    return NextResponse.json({ message: 'Status updated' });
  } catch (error) {
    console.error('Update status error:', error);
    return NextResponse.json(
      { message: 'Failed to update status' },
      { status: 500 }
    );
  }
}