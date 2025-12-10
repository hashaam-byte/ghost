import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db';

export async function GET() {
  const checks = {
    groqKey: false,
    openaiKey: false,
    dbConnection: false,
    aiTest: false,
  };

  // Check Groq API key
  checks.groqKey = !!process.env.GROQ_API_KEY;
  checks.openaiKey = !!process.env.OPENAI_API_KEY;

  // Check database connection
  try {
    await db.$queryRaw`SELECT 1`;
    checks.dbConnection = true;
  } catch (error) {
    console.error('DB connection check failed:', error);
    checks.dbConnection = false;
  }

  return NextResponse.json(checks);
}