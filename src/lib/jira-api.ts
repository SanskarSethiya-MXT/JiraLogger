/**
 * @file jira-api.ts
 * @description Direct Jira API calls for Chrome extension (bypasses Next.js API routes)
 */

export interface JiraCredentials {
  url: string;
  email: string;
  apiToken: string;
}

/**
 * Create Basic Auth header from credentials
 */
function createAuthHeader(email: string, apiToken: string): string {
  return `Basic ${btoa(`${email}:${apiToken}`)}`;
}

/**
 * Log worklog entry to Jira
 */
export async function logWorklogToJira(
  credentials: JiraCredentials,
  ticket: string,
  payload: string
): Promise<any> {
  const jiraUrl = `${credentials.url}/rest/api/2/issue/${ticket}/worklog`;
  
  const response = await fetch(jiraUrl, {
    method: 'POST',
    headers: {
      'Authorization': createAuthHeader(credentials.email, credentials.apiToken),
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: payload,
  });

  if (!response.ok) {
    const errorData = await response.text();
    try {
      const jsonError = JSON.parse(errorData);
      throw new Error(jsonError.errorMessages?.join(', ') || 'Jira API error');
    } catch (e) {
      throw new Error(errorData || `Jira API responded with status ${response.status}`);
    }
  }
  
  return await response.json();
}

/**
 * Fetch user worklogs from Jira for a date range
 */
export async function fetchUserWorklogs(
  credentials: JiraCredentials,
  dateFrom: string,
  dateTo: string
): Promise<Record<string, any[]>> {
  const jiraUrlBase = credentials.url.replace(/\/$/, '');
  const auth = createAuthHeader(credentials.email, credentials.apiToken);

  // Build JQL to find issues with worklogs by the current authenticated user
  const jql = `worklogAuthor = currentUser() AND worklogDate >= "${dateFrom}" AND worklogDate <= "${dateTo}"`;
  const searchUrl = `${jiraUrlBase}/rest/api/3/search/jql`;

  const res = await fetch(searchUrl, {
    method: 'POST',
    headers: {
      'Authorization': auth,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ jql, fields: ['worklog'], maxResults: 1000 }),
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error('Authentication failed');
    }
    return {};
  }

  const data = await res.json();
  const issues = data.issues || [];

  // Get current user's account ID for filtering
  let currentUserAccountId: string | null = null;
  try {
    const myselfUrl = `${jiraUrlBase}/rest/api/3/myself`;
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
    }
  } catch (e) {
    console.warn('Failed to fetch current user info', e);
  }

  const worklogsByTicket: Record<string, any[]> = {};

  // Fetch full worklog details for each issue
  for (const issue of issues) {
    const ticket = issue.key;
    
    try {
      const worklogUrl = `${jiraUrlBase}/rest/api/3/issue/${encodeURIComponent(ticket)}/worklog`;
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
        
        const filtered = worklogs.filter((w: any) => {
          if (!w.started) return false;
          
          if (currentUserAccountId && w.author && w.author.accountId !== currentUserAccountId) {
            return false;
          }
          
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
      console.warn(`Failed to fetch worklogs for ${ticket}`, e);
    }
  }

  return worklogsByTicket;
}
