// Обёртки над GitHub REST/GraphQL API + OAuth

export interface GithubTokenResponse {
  access_token: string;
  scope: string;
  token_type: string;
}

export interface GithubProfile {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

export interface ContributionDay {
  date: string;
  contributionCount: number;
}

const GITHUB_ID = process.env.GITHUB_ID as string;
const GITHUB_SECRET = process.env.GITHUB_SECRET as string;

// Шаг 2 OAuth: обмен code на access_token
export async function exchangeCodeForToken(
  code: string
): Promise<GithubTokenResponse> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: GITHUB_ID,
      client_secret: GITHUB_SECRET,
      code,
    }),
  });

  if (!res.ok) {
    throw new Error(`GitHub OAuth token error: ${res.status}`);
  }

  const data = (await res.json()) as GithubTokenResponse & { error?: string };
  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error}`);
  }
  return data;
}

// Получаем профиль пользователя по access_token
export async function fetchGithubProfile(
  accessToken: string
): Promise<GithubProfile> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `token ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`);
  }

  const profile = (await res.json()) as GithubProfile;

  // email иногда приватный, добираем отдельно
  if (!profile.email) {
    const emailsRes = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    if (emailsRes.ok) {
      const emails = (await emailsRes.json()) as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;
      const primary = emails.find((e) => e.primary) || emails[0];
      if (primary) profile.email = primary.email;
    }
  }

  return profile;
}

export interface GitHubEvent {
  type: string;
  created_at: string;
  payload?: { commits?: unknown[] };
}

export interface DailyStatsData {
  date: string;
  commits: number;
  prs: number;
  issues: number;
}

export async function fetchGitHubEvents(
  username: string,
  accessToken: string,
  perPage = 100,
  page = 1
): Promise<GitHubEvent[]> {
  const res = await fetch(
    `https://api.github.com/users/${username}/events?per_page=${perPage}&page=${page}`,
    {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`);
  }
  return res.json();
}

export function aggregateStats(events: GitHubEvent[]): DailyStatsData[] {
  const dailyMap = new Map<string, DailyStatsData>();

  for (const event of events) {
    const date = event.created_at.slice(0, 10);
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { date, commits: 0, prs: 0, issues: 0 });
    }
    const day = dailyMap.get(date)!;

    if (event.type === "PushEvent") {
      day.commits += event.payload?.commits?.length ?? 1;
    } else if (event.type === "PullRequestEvent") {
      day.prs += 1;
    } else if (event.type === "IssuesEvent") {
      day.issues += 1;
    }
  }

  return Array.from(dailyMap.values());
}

export async function fetchContributions(
  username: string,
  accessToken: string,
  from?: string,
  to?: string
): Promise<ContributionDay[]> {
  const query = `
    query($username: String!, $from: DateTime, $to: DateTime) {
      user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  `;

  const variables = {
    username,
    from: from || new Date(Date.now() - 366 * 24 * 60 * 60 * 1000).toISOString(),
    to: to || new Date().toISOString(),
  };

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`GraphQL error: ${res.status}`);
  }

  const json = await res.json();
  if (json.errors) {
    console.error(json.errors);
    throw new Error(json.errors[0].message);
  }

  const weeks = json.data.user.contributionsCollection.contributionCalendar.weeks;
  const days: ContributionDay[] = [];
  for (const week of weeks) {
    for (const day of week.contributionDays) {
      days.push({
        date: day.date,
        contributionCount: day.contributionCount,
      });
    }
  }
  return days;
}
