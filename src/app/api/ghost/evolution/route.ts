// src/app/api/ghost/evolution/route.ts
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

// Evolution stage requirements
const EVOLUTION_REQUIREMENTS: Record<number, { xp: number; form: string; name: string }> = {
  1: { xp: 0, form: 'baby', name: 'Baby Ghost' },
  2: { xp: 500, form: 'spectral_i', name: 'Spectral I' },
  3: { xp: 1500, form: 'spectral_ii', name: 'Spectral II' },
  4: { xp: 3500, form: 'spectral_iii', name: 'Spectral III' },
  5: { xp: 7000, form: 'ethereal', name: 'Ethereal' },
  6: { xp: 15000, form: 'phantom', name: 'Phantom' },
  7: { xp: 30000, form: 'omega', name: 'Omega Ghost' },
};

// GET - Get Evolution Status
export async function GET(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const ghostProfile = await db.ghostProfile.findUnique({
      where: { userId: decoded.userId },
      select: {
        evolutionStage: true,
        ghostForm: true,
        totalXP: true,
        unlockedPowers: true,
      },
    });

    if (!ghostProfile) {
      return NextResponse.json(
        { message: 'Ghost profile not found' },
        { status: 404 }
      );
    }

    const currentStage = ghostProfile.evolutionStage;
    const nextStage = currentStage < 7 ? currentStage + 1 : 7;
    const nextStageReq = EVOLUTION_REQUIREMENTS[nextStage];

    const canEvolve = ghostProfile.totalXP >= nextStageReq.xp && currentStage < 7;

    return NextResponse.json({
      currentStage,
      currentForm: ghostProfile.ghostForm,
      currentFormName: EVOLUTION_REQUIREMENTS[currentStage].name,
      totalXP: ghostProfile.totalXP,
      nextStage: currentStage < 7 ? nextStage : null,
      nextStageXP: nextStageReq.xp,
      nextForm: nextStageReq.form,
      nextFormName: nextStageReq.name,
      xpNeeded: Math.max(0, nextStageReq.xp - ghostProfile.totalXP),
      canEvolve,
      unlockedAbilities: ghostProfile.unlockedPowers,
    });
  } catch (error) {
    console.error('Get evolution status error:', error);
    return NextResponse.json(
      { message: 'Failed to get evolution status' },
      { status: 500 }
    );
  }
}

// POST - Trigger Evolution
export async function POST(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { force } = await request.json();

    const ghostProfile = await db.ghostProfile.findUnique({
      where: { userId: decoded.userId },
    });

    if (!ghostProfile) {
      return NextResponse.json(
        { message: 'Ghost profile not found' },
        { status: 404 }
      );
    }

    const currentStage = ghostProfile.evolutionStage;
    const nextStage = currentStage + 1;

    if (nextStage > 7) {
      return NextResponse.json(
        { message: 'Already at max evolution stage' },
        { status: 400 }
      );
    }

    const nextStageReq = EVOLUTION_REQUIREMENTS[nextStage];

    // Check if eligible (unless forced by admin)
    if (!force && ghostProfile.totalXP < nextStageReq.xp) {
      return NextResponse.json(
        {
          message: 'Insufficient XP',
          required: nextStageReq.xp,
          current: ghostProfile.totalXP,
          needed: nextStageReq.xp - ghostProfile.totalXP,
        },
        { status: 400 }
      );
    }

    // Perform evolution
    const updatedGhost = await db.ghostProfile.update({
      where: { userId: decoded.userId },
      data: {
        evolutionStage: nextStage,
        ghostForm: nextStageReq.form,
      },
    });

    // Log evolution history
    await db.evolutionHistory.create({
      data: {
        userId: decoded.userId,
        fromStage: currentStage,
        toStage: nextStage,
        fromForm: ghostProfile.ghostForm,
        toForm: nextStageReq.form,
        trigger: force ? 'admin_force' : 'xp_threshold',
        xpAtEvolution: ghostProfile.totalXP,
      },
    });

    // Create notification
    await db.notification.create({
      data: {
        userId: decoded.userId,
        type: 'evolution',
        title: '🎉 Ghost Evolved!',
        message: `Your ghost evolved to ${nextStageReq.name}!`,
        data: {
          newStage: nextStage,
          newForm: nextStageReq.form,
        },
      },
    });

    // Award bonus XP
    await db.xPHistory.create({
      data: {
        userId: decoded.userId,
        amount: 100,
        reason: `Evolution to ${nextStageReq.name}`,
        category: 'evolution',
      },
    });

    await db.ghostProfile.update({
      where: { userId: decoded.userId },
      data: {
        totalXP: { increment: 100 },
      },
    });

    return NextResponse.json({
      success: true,
      newStage: nextStage,
      newForm: nextStageReq.form,
      newFormName: nextStageReq.name,
      visualChanges: true,
      bonusXP: 100,
    });
  } catch (error) {
    console.error('Evolution error:', error);
    return NextResponse.json(
      { message: 'Failed to evolve ghost' },
      { status: 500 }
    );
  }
}

// PATCH - Get Evolution History
export async function PATCH(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const history = await db.evolutionHistory.findMany({
      where: { userId: decoded.userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      history,
      totalEvolutions: history.length,
    });
  } catch (error) {
    console.error('Get evolution history error:', error);
    return NextResponse.json(
      { message: 'Failed to get evolution history' },
      { status: 500 }
    );
  }
}