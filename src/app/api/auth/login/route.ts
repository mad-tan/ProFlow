import { NextRequest, NextResponse } from 'next/server';
import { loginUser, createSessionToken, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: { message: 'Email and password are required' } },
        { status: 400 }
      );
    }

    const user = loginUser(email, password);
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
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 400 }
    );
  }
}
