export async function fetchGitHubRepos(token?: string): Promise<any[]> {
  const authToken = token || process.env.GITHUB_TOKEN;
  if (!authToken) {
    return [
      {
        name: 'alexrivera/videovault-ai',
        description: 'AI-powered video bookmarking and chapter summarizer',
        stars: 42,
        forks: 5,
        openIssues: 3,
        openPRs: 1,
        defaultBranch: 'main',
        lastUpdated: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
      {
        name: 'alexrivera/alexrivera-dev',
        description: 'Developer portfolio with Next.js & Framer Motion',
        stars: 18,
        forks: 2,
        openIssues: 0,
        openPRs: 0,
        defaultBranch: 'main',
        lastUpdated: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
    ];
  }

  try {
    const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=10', {
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Recall-AI-Assistant',
      },
    });
    if (!res.ok) throw new Error(`GitHub API HTTP ${res.status}`);
    const data = await res.json();
    return data.map((r: any) => ({
      name: r.full_name,
      description: r.description || 'No description provided',
      stars: r.stargazers_count,
      forks: r.forks_count,
      openIssues: r.open_issues_count,
      defaultBranch: r.default_branch,
      url: r.html_url,
      lastUpdated: r.updated_at,
    }));
  } catch (err) {
    console.error('Failed to fetch real GitHub repos:', err);
    return [];
  }
}

export async function fetchGitHubCommits(repo: string, token?: string): Promise<any[]> {
  const authToken = token || process.env.GITHUB_TOKEN;
  if (!authToken) {
    return [
      {
        sha: 'a8f192b',
        message: 'feat(transcripts): implement chunked streaming cache with Redis and Whisper',
        author: 'Alex Rivera',
        date: new Date(Date.now() - 3600000 * 2).toISOString(),
        filesChanged: 4,
        insertions: 128,
        deletions: 14,
      },
      {
        sha: 'c3901de',
        message: 'fix(player): handle seek timestamp offsets for YouTube embedded iframes',
        author: 'Alex Rivera',
        date: new Date(Date.now() - 3600000 * 5).toISOString(),
        filesChanged: 2,
        insertions: 34,
        deletions: 8,
      },
      {
        sha: '7b941aa',
        message: 'style(ui): update dashboard card paddings and obsidian dark theme tokens',
        author: 'Alex Rivera',
        date: new Date(Date.now() - 3600000 * 7).toISOString(),
        filesChanged: 6,
        insertions: 76,
        deletions: 52,
      },
    ];
  }

  try {
    const cleanRepo = repo.includes('/') ? repo : `owner/${repo}`;
    const res = await fetch(`https://api.github.com/repos/${cleanRepo}/commits?per_page=5`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Recall-AI-Assistant',
      },
    });
    if (!res.ok) throw new Error(`GitHub API HTTP ${res.status}`);
    const data = await res.json();
    return data.map((c: any) => ({
      sha: c.sha.slice(0, 7),
      message: c.commit.message,
      author: c.commit.author.name,
      date: c.commit.author.date,
      url: c.html_url,
    }));
  } catch (err) {
    console.error('Failed to fetch real GitHub commits:', err);
    return [];
  }
}
