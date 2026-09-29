/**
 * Dynamic Programming Levenshtein Distance & Fuzzy Matcher
 * Time Complexity: O(M * N) for distance, O(K * M * N) across vocabulary
 */

export class FuzzyMatcher {
  /**
   * Computes minimum edit distance (insertions, deletions, substitutions)
   */
  public static levenshteinDistance(s1: string, s2: string): number {
    const a = s1.toLowerCase().trim();
    const b = s2.toLowerCase().trim();

    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    // Space-optimized DP array O(N)
    let prevRow = Array.from({ length: b.length + 1 }, (_, i) => i);
    let currRow = new Array(b.length + 1);

    for (let i = 1; i <= a.length; i++) {
      currRow[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        currRow[j] = Math.min(
          prevRow[j] + 1,      // deletion
          currRow[j - 1] + 1,  // insertion
          prevRow[j - 1] + cost // substitution
        );
      }
      prevRow = [...currRow];
    }

    return prevRow[b.length];
  }

  /**
   * Similarity score between 0.0 (completely different) and 1.0 (identical)
   */
  public static similarity(s1: string, s2: string): number {
    const maxLen = Math.max(s1.length, s2.length);
    if (maxLen === 0) return 1.0;
    const dist = this.levenshteinDistance(s1, s2);
    return (maxLen - dist) / maxLen;
  }

  /**
   * Finds the best matching candidate from a list
   */
  public static findBestMatch(
    query: string,
    candidates: string[],
    minSimilarityThreshold: number = 0.6
  ): { match: string; score: number } | null {
    let bestMatch: string | null = null;
    let highestScore = -1;

    for (const c of candidates) {
      const score = this.similarity(query, c);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = c;
      }
    }

    if (bestMatch && highestScore >= minSimilarityThreshold) {
      return { match: bestMatch, score: highestScore };
    }

    return null;
  }
}
