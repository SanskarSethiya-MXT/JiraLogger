import { NextResponse } from 'next/server';

type Worklog = {
  id: string;
  author?: any;
  comment?: any;
  started: string;
  timeSpentSeconds: number;
};

export async function POST(request: Request) {
  try {
    const { jiraUrlBase, auth, tickets } = await request.json();

    if (!jiraUrlBase || !auth || !tickets || !Array.isArray(tickets)) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const results: Record<string, Worklog[]> = {};

    // For each ticket, fetch its worklog list
    await Promise.all(tickets.map(async (ticket: string) => {
      try {
        const url = `${jiraUrlBase.replace(/\/$/, '')}/rest/api/2/issue/${encodeURIComponent(ticket)}/worklog`;
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': auth,
            'Accept': 'application/json',
          },
        });
        if (!res.ok) {
          results[ticket] = [];
          return;
        }
        const json = await res.json();
        // Jira returns { worklogs: [...] }
        const worklogs = json.worklogs || [];
        results[ticket] = worklogs.map((w: any) => ({
          id: w.id,
          author: w.author,
          comment: w.comment,
          started: w.started,
          timeSpentSeconds: w.timeSpentSeconds,
        }));
      } catch (e) {
        results[ticket] = [];
      }
    }));

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}
