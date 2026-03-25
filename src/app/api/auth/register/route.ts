import { NextRequest, NextResponse } from 'next/server';
import { registerUser, createSessionToken, SESSION_COOKIE } from '@/lib/auth';
import { errorResponse } from '@/lib/utils/api-response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: { message: 'Email, password, and name are required' } },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: { message: 'Password must be at least 6 characters' } },
        { status: 400 }
      );
    }

    const user = registerUser(email, password, name);
    const token = createSessionToken(user.id);

    const response = NextResponse.json({
      success: true,
      data: { id: user.id, email: user.email, name: user.name },
    });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 400 }
    );
  }
}
