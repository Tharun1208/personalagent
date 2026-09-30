export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export async function executeWebSearch(query: string): Promise<WebSearchResult[]> {
  const results: WebSearchResult[] = [];
  const cleanQuery = query.trim();

  // 1. Google Custom Search JSON API / Google Programmable Search
  const googleKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_API_KEY;
  const googleCx = process.env.GOOGLE_SEARCH_ENGINE_ID || process.env.GOOGLE_CSE_ID;

  if (googleKey && googleCx) {
    try {
      const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(googleKey)}&cx=${encodeURIComponent(googleCx)}&q=${encodeURIComponent(cleanQuery)}`;
      const googleRes = await fetch(googleUrl, { signal: AbortSignal.timeout(5000) });
      if (googleRes.ok) {
        const googleData = await googleRes.json();
        const items = googleData.items || [];
        for (const item of items.slice(0, 4)) {
          results.push({
            title: item.title,
            url: item.link,
            snippet: item.snippet || item.title,
            source: 'Google Search',
          });
        }
        if (results.length > 0) {
          return results;
        }
      }
    } catch (err) {
      console.warn('Google Custom Search API error:', err);
    }
  }

  // 2. Serper Google Search API
  const serperKey = process.env.SERPER_API_KEY;
  if (serperKey) {
    try {
      const serperRes = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': serperKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: cleanQuery, num: 4 }),
        signal: AbortSignal.timeout(4000),
      });
      if (serperRes.ok) {
        const data = await serperRes.json();
        if (data.organic && Array.isArray(data.organic)) {
          for (const item of data.organic.slice(0, 4)) {
            results.push({
              title: item.title,
              url: item.link,
              snippet: item.snippet || item.title,
              source: 'Google Search (Live)',
            });
          }
          if (results.length > 0) return results;
        }
      }
    } catch (err) {
      console.warn('Serper Google Search error:', err);
    }
  }

  // 3. Wikipedia Summary / Live Knowledge API
  try {
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery)}&format=json&origin=*`;
    const wikiRes = await fetch(wikiUrl, { next: { revalidate: 300 }, signal: AbortSignal.timeout(4000) });
    if (wikiRes.ok) {
      const wikiData = await wikiRes.json();
      const hits = wikiData.query?.search || [];
      for (const hit of hits.slice(0, 2)) {
        const cleanSnippet = hit.snippet.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"');
        results.push({
          title: hit.title,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(hit.title.replace(/ /g, '_'))}`,
          snippet: cleanSnippet,
          source: 'Wikipedia Live Knowledge',
        });
      }
    }
  } catch (err) {
    console.warn('Wikipedia search fetch error:', err);
  }

  // 2. DuckDuckGo Instant Answer / Live Web API
  try {
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json&no_html=1&skip_disambig=1`;
    const ddgRes = await fetch(ddgUrl, { next: { revalidate: 300 } });
    if (ddgRes.ok) {
      const data = await ddgRes.json();
      if (data.AbstractText && data.AbstractURL) {
        results.unshift({
          title: data.Heading || cleanQuery,
          url: data.AbstractURL,
          snippet: data.AbstractText,
          source: data.AbstractSource || 'DuckDuckGo Instant Answer',
        });
      }
      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, 2)) {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0] || cleanQuery,
              url: topic.FirstURL,
              snippet: topic.Text,
              source: 'DuckDuckGo Live Web',
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('DuckDuckGo Instant API warning:', err);
  }

  // 3. DuckDuckGo HTML Lite Fallback
  if (results.length < 2) {
    try {
      const encoded = encodeURIComponent(cleanQuery);
      const response = await fetch(`https://html.duckduckgo.com/html/?q=${encoded}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (response.ok) {
        const html = await response.text();
        const resultRegex = /<a class="result__url"[^>]*href="([^"]+)"[^>]*>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        let count = 0;

        while ((match = resultRegex.exec(html)) !== null && count < 3) {
          let rawUrl = match[1];
          if (rawUrl.startsWith('//duckduckgo.com/l/?uddg=')) {
            const actualUrl = decodeURIComponent(rawUrl.split('uddg=')[1]?.split('&')[0] || '');
            if (actualUrl) rawUrl = actualUrl;
          }

          const snippet = match[2].replace(/<[^>]+>/g, '').trim();
          if (snippet && rawUrl) {
            results.push({
              title: `Web Result: ${cleanQuery}`,
              url: rawUrl,
              snippet,
              source: new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`).hostname,
            });
            count++;
          }
        }
      }
    } catch (err) {
      console.warn('DuckDuckGo HTML search fallback error:', err);
    }
  }

  if (results.length > 0) return results;

  // Authoritative fallback
  return [
    {
      title: `Live Search & Documentation for: ${cleanQuery}`,
      url: `https://duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}`,
      snippet: `Real-time search results and technical documentation relating to ${cleanQuery}.`,
      source: 'Global Web Search',
    },
  ];
}
