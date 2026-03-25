import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const userId = getCurrentUserId();
    const db = getDb();
    const user = db.prepare('SELECT id, email, name, avatar_url, timezone FROM users WHERE id = ?').get(userId) as {
      id: string; email: string; name: string; avatar_url: string | null; timezone: string;
    } | undefined;

    if (!user) {
      return NextResponse.json({ success: false, error: { message: 'Not authenticated' } }, { status: 401 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch {
    return NextResponse.json({ success: false, error: { message: 'Not authenticated' } }, { status: 401 });
  }
}
