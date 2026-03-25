import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

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

export async function PUT(request: NextRequest) {
  try {
    const userId = getCurrentUserId();
    const db = getDb();
    const body = await request.json();
    const { name, currentPassword, newPassword } = body;

    const user = db.prepare('SELECT id, name, email, password_hash FROM users WHERE id = ?').get(userId) as {
      id: string; name: string; email: string; password_hash: string | null;
    } | undefined;

    if (!user) {
      return NextResponse.json({ success: false, error: { message: 'User not found' } }, { status: 404 });
    }

    const updates: string[] = [];
    const params: unknown[] = [];

    if (name && name.trim()) {
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ success: false, error: { message: 'Current password is required' } }, { status: 400 });
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ success: false, error: { message: 'New password must be at least 6 characters' } }, { status: 400 });
      }

      // Verify current password
      if (user.password_hash) {
        const [salt, hash] = user.password_hash.split(':');
        const attempt = crypto.pbkdf2Sync(currentPassword, salt, 100000, 64, 'sha512').toString('hex');
        if (attempt !== hash) {
          return NextResponse.json({ success: false, error: { message: 'Current password is incorrect' } }, { status: 400 });
        }
      }

      const newSalt = crypto.randomBytes(16).toString('hex');
      const newHash = crypto.pbkdf2Sync(newPassword, newSalt, 100000, 64, 'sha512').toString('hex');
      updates.push('password_hash = ?');
      params.push(`${newSalt}:${newHash}`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: { message: 'Nothing to update' } }, { status: 400 });
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(userId);

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare('SELECT id, email, name, avatar_url, timezone FROM users WHERE id = ?').get(userId);
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed';
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}
