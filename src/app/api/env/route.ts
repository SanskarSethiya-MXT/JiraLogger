import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const baseUrl = process.env.JIRA_BASE_URL || null;
    const email = process.env.JIRA_EMAIL || null;
    const hasToken = !!process.env.JIRA_API_TOKEN;

    // Only include the actual token in non-production environments for local dev convenience.
    const token = process.env.NODE_ENV !== 'production' ? process.env.JIRA_API_TOKEN || null : null;

    return NextResponse.json({ baseUrl, email, hasToken, token });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read environment variables' }, { status: 500 });
  }
}
