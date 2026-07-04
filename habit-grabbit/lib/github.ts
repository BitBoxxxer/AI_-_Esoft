export interface GitHubEvent {
  type: string;
  created_at: string;
}

export interface DailyStatsData {
  date: string; // YYYY-MM-DD
  commits: number;
  prs: number;
  issues: number;
}

// Получаем сырые события пользователя (только публичные)
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

// Агрегируем события по дням
export function aggregateStats(events: GitHubEvent[]): DailyStatsData[] {
  const dailyMap = new Map<string, DailyStatsData>();

  for (const event of events) {
    const date = event.created_at.slice(0, 10); // YYYY-MM-DD
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { date, commits: 0, prs: 0, issues: 0 });
    }
    const day = dailyMap.get(date)!;

    if (event.type === "PushEvent") {
      // Учитываем количество коммитов в пуше
      day.commits += (event as { payload?: { commits?: unknown[] } }).payload?.commits?.length ?? 1;
    } else if (event.type === "PullRequestEvent") {
      day.prs += 1;
    } else if (event.type === "IssuesEvent") {
      day.issues += 1;
    }
  }

  return Array.from(dailyMap.values());
}

// lib/github.ts

export interface ContributionDay {
  date: string;
  contributionCount: number;
}

export async function fetchContributions(
  username: string,
  accessToken: string,
  from?: string, // YYYY-MM-DDTHH:MM:SSZ
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