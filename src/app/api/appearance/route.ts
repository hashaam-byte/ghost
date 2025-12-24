// src/app/api/appearance/route.ts
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

// POST - Save Wallpaper/Theme Preferences
export async function POST(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const {
      mode,
      blur,
      darken,
      motion,
      extractedPalette,
      overridePrimary,
      overrideAccent,
      overrideGlow,
      lockTheme,
      batterySaverMode,
      particleDensity,
    } = await request.json();

    // Upsert appearance settings
    const settings = await db.appearanceSettings.upsert({
      where: { userId: decoded.userId },
      update: {
        mode: mode || undefined,
        blur: blur !== undefined ? blur : undefined,
        darken: darken !== undefined ? darken : undefined,
        motion: motion !== undefined ? motion : undefined,
        extractedPalette: extractedPalette || undefined,
        overridePrimary: overridePrimary || undefined,
        overrideAccent: overrideAccent || undefined,
        overrideGlow: overrideGlow || undefined,
        lockTheme: lockTheme !== undefined ? lockTheme : undefined,
        batterySaverMode: batterySaverMode !== undefined ? batterySaverMode : undefined,
        particleDensity: particleDensity !== undefined ? particleDensity : undefined,
      },
      create: {
        userId: decoded.userId,
        mode: mode || 'auto',
        blur: blur || 20,
        darken: darken || 0.35,
        motion: motion !== undefined ? motion : true,
        extractedPalette,
        overridePrimary,
        overrideAccent,
        overrideGlow,
        lockTheme: lockTheme || false,
        batterySaverMode: batterySaverMode || false,
        particleDensity: particleDensity || 50,
      },
    });

    // Update ghost profile colors if manual override
    if (mode === 'manual' && (overridePrimary || overrideAccent || overrideGlow)) {
      await db.ghostProfile.update({
        where: { userId: decoded.userId },
        data: {
          skinColor: overridePrimary || undefined,
          auraColor: overrideAccent || undefined,
          glowColor: overrideGlow || undefined,
        },
      });
    }

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Appearance settings error:', error);
    return NextResponse.json(
      { message: 'Failed to save appearance settings' },
      { status: 500 }
    );
  }
}

// GET - Retrieve Appearance Settings
export async function GET(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const settings = await db.appearanceSettings.findUnique({
      where: { userId: decoded.userId },
    });

    // Return defaults if not found
    if (!settings) {
      return NextResponse.json({
        mode: 'auto',
        blur: 20,
        darken: 0.35,
        motion: true,
        extractedPalette: null,
        overridePrimary: null,
        overrideAccent: null,
        overrideGlow: null,
        lockTheme: false,
        batterySaverMode: false,
        particleDensity: 50,
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Get appearance settings error:', error);
    return NextResponse.json(
      { message: 'Failed to get appearance settings' },
      { status: 500 }
    );
  }
}

// PUT - Update Extracted Palette (Auto Mode)
export async function PUT(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { extractedPalette } = await request.json();

    if (!extractedPalette) {
      return NextResponse.json(
        { message: 'extractedPalette is required' },
        { status: 400 }
      );
    }

    const settings = await db.appearanceSettings.upsert({
      where: { userId: decoded.userId },
      update: {
        extractedPalette,
      },
      create: {
        userId: decoded.userId,
        extractedPalette,
      },
    });

    // Auto-update ghost colors if in auto mode
    if (settings.mode === 'auto' && !settings.lockTheme) {
      const palette = extractedPalette as any;
      await db.ghostProfile.update({
        where: { userId: decoded.userId },
        data: {
          skinColor: palette.primary || undefined,
          auraColor: palette.accent || undefined,
          glowColor: palette.glow || undefined,
        },
      });
    }

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Update palette error:', error);
    return NextResponse.json(
      { message: 'Failed to update extracted palette' },
      { status: 500 }
    );
  }
}