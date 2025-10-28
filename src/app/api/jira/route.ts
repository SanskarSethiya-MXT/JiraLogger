import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { jiraUrl, auth, payload } = await request.json();

    const response = await fetch(jiraUrl, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: payload,
    });

    if (!response.ok) {
      const errorData = await response.text();
      try {
        // Try parsing as JSON for structured Jira errors
        const jsonError = JSON.parse(errorData);
        return NextResponse.json({ error: jsonError.errorMessages?.join(', ') || 'Jira API error' }, { status: response.status });
      } catch (e) {
        // Fallback to text if not JSON
        return NextResponse.json({ error: errorData }, { status: response.status });
      }
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Proxy error: ${errorMessage}` }, { status: 500 });
  }
}
