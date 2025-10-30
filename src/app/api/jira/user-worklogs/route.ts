import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { jiraUrlBase, auth, dateFrom, dateTo } = await request.json();
    if (!jiraUrlBase || !auth || !dateFrom || !dateTo) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Build JQL to find issues with worklogs by the current authenticated user in the date range.
    // Use the newer /rest/api/3/search/jql endpoint (POST with JSON body) — some Jira instances
    // have removed the older query-string endpoint and respond with 410.
    const jql = `worklogAuthor = currentUser() AND worklogDate >= "${dateFrom}" AND worklogDate <= "${dateTo}"`;
    const searchUrl = `${jiraUrlBase.replace(/\/$/, '')}/rest/api/3/search/jql`;

    const res = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jql, fields: ['worklog'], maxResults: 1000 }),
    });

    // DEV: log Jira response status and small snippet of body when not OK
    try {
      if (!res.ok) {
        const txt = await res.text();
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[user-worklogs] Jira search responded', { status: res.status, snippet: txt?.slice?.(0, 200) });
        }
        if (res.status === 401 || res.status === 403) {
          return NextResponse.json({ error: `Auth failed` }, { status: res.status });
        }
        return NextResponse.json({}, { status: 200 });
      }
    } catch (e) {
      // if reading response failed, fallback
      if (process.env.NODE_ENV !== 'production') console.warn('[user-worklogs] failed reading Jira response', e);
      return NextResponse.json({}, { status: 200 });
    }

    const data = await res.json();
    const issues = data.issues || [];

    // Get current user's account ID for filtering
    let currentUserAccountId: string | null = null;
    try {
      const myselfUrl = `${jiraUrlBase.replace(/\/$/, '')}/rest/api/3/myself`;
      const myselfRes = await fetch(myselfUrl, {
        method: 'GET',
        headers: {
          'Authorization': auth,
          'Accept': 'application/json',
        },
      });
      if (myselfRes.ok) {
        const myselfData = await myselfRes.json();
        currentUserAccountId = myselfData.accountId;
        if (process.env.NODE_ENV !== 'production') {
          console.log('[user-worklogs] Current user accountId:', currentUserAccountId);
        }
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[user-worklogs] Failed to fetch current user info', e);
      }
    }

    const worklogsByTicket: Record<string, any[]> = {};

    // Fetch full worklog details for each issue since the search endpoint may paginate worklogs
    for (const issue of issues) {
      const ticket = issue.key;
      
      try {
        // Fetch complete worklog list for this ticket
        const worklogUrl = `${jiraUrlBase.replace(/\/$/, '')}/rest/api/3/issue/${encodeURIComponent(ticket)}/worklog`;
        const worklogRes = await fetch(worklogUrl, {
          method: 'GET',
          headers: {
            'Authorization': auth,
            'Accept': 'application/json',
          },
        });

        if (worklogRes.ok) {
          const worklogData = await worklogRes.json();
          const worklogs = worklogData.worklogs || [];
          
          // Filter worklogs to:
          // 1. Only current user's worklogs (by accountId)
          // 2. Within dateFrom..dateTo (worklog.started)
          const filtered = worklogs.filter((w: any) => {
            if (!w.started) return false;
            
            // Filter by current user - check accountId
            if (currentUserAccountId && w.author && w.author.accountId !== currentUserAccountId) {
              return false;
            }
            
            // Filter by date range
            const started = w.started.split('T')[0];
            return started >= dateFrom && started <= dateTo;
          }).map((w: any) => ({
            id: w.id,
            ticket,
            started: w.started,
            timeSpentSeconds: w.timeSpentSeconds,
            comment: w.comment,
            author: w.author,
          }));

          if (filtered.length > 0) {
            worklogsByTicket[ticket] = filtered;
          }
        }
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[user-worklogs] Failed to fetch worklogs for ${ticket}`, e);
        }
        // Continue with other tickets even if one fails
      }
    }

    return NextResponse.json(worklogsByTicket);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[user-worklogs] Error:', error);
    }
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}
