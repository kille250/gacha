/**
 * Fuzzy Search Utility
 *
 * Provides typo-tolerant search with character highlighting.
 * Uses a simple but effective fuzzy matching algorithm.
 */

/**
 * Calculate fuzzy match score between query and text.
 * Returns an object with score and matched character indices.
 *
 * @param {string} query - Search query
 * @param {string} text - Text to search in
 * @returns {{ score: number, indices: number[] } | null} Match result or null if no match
 */
export function fuzzyMatch(query, text) {
  if (!query || !text) return null;

  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Exact substring match gets highest score
  const exactIndex = textLower.indexOf(queryLower);
  if (exactIndex !== -1) {
    const indices = [];
    for (let i = exactIndex; i < exactIndex + query.length; i++) {
      indices.push(i);
    }
    return { score: 100 + (1 / (exactIndex + 1)), indices };
  }

  // Fuzzy match: find all query characters in order
  const indices = [];
  let queryIdx = 0;
  let lastMatchIdx = -1;
  let consecutiveBonus = 0;
  let score = 0;

  for (let i = 0; i < text.length && queryIdx < query.length; i++) {
    if (textLower[i] === queryLower[queryIdx]) {
      indices.push(i);

      // Bonus for consecutive matches
      if (lastMatchIdx === i - 1) {
        consecutiveBonus += 5;
      }

      // Bonus for matching at word boundaries
      if (i === 0 || /[\s\-_.]/.test(text[i - 1])) {
        score += 10;
      }

      lastMatchIdx = i;
      queryIdx++;
    }
  }

  // All query characters must be found
  if (queryIdx !== query.length) {
    return null;
  }

  // Calculate final score
  // Base score: percentage of query matched
  score += 50;

  // Bonus for consecutive matches
  score += consecutiveBonus;

  // Penalty for spread (characters far apart)
  const spread = indices[indices.length - 1] - indices[0];
  score -= Math.max(0, spread - query.length) * 0.5;

  // Bonus for shorter text (more relevant)
  score += Math.max(0, 20 - text.length * 0.2);

  return { score, indices };
}

/**
 * Search and sort items by fuzzy match score.
 *
 * @template T
 * @param {T[]} items - Array of items to search
 * @param {string} query - Search query
 * @param {(item: T) => string[]} getSearchFields - Function to extract searchable fields
 * @returns {Array<{ item: T, matches: { [field: string]: number[] } }>} Matched items with indices
 */
export function fuzzySearch(items, query, getSearchFields) {
  if (!query.trim()) {
    return items.map(item => ({ item, matches: {} }));
  }

  const results = [];

  for (const item of items) {
    const fields = getSearchFields(item);
    let bestScore = 0;
    const matches = {};

    for (const field of fields) {
      const match = fuzzyMatch(query, field);
      if (match) {
        if (match.score > bestScore) {
          bestScore = match.score;
        }
        matches[field] = match.indices;
      }
    }

    if (bestScore > 0) {
      results.push({ item, matches, score: bestScore });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.map(({ item, matches }) => ({ item, matches }));
}

/**
 * Highlight matched characters in text.
 *
 * @param {string} text - Original text
 * @param {number[]} indices - Matched character indices
 * @returns {Array<{ text: string, highlighted: boolean }>} Text segments
 */
export function highlightMatches(text, indices) {
  if (!indices || indices.length === 0) {
    return [{ text, highlighted: false }];
  }

  const indexSet = new Set(indices);
  const segments = [];
  let currentSegment = '';
  let currentHighlighted = false;

  for (let i = 0; i < text.length; i++) {
    const isHighlighted = indexSet.has(i);

    if (i === 0) {
      currentHighlighted = isHighlighted;
      currentSegment = text[i];
    } else if (isHighlighted === currentHighlighted) {
      currentSegment += text[i];
    } else {
      segments.push({ text: currentSegment, highlighted: currentHighlighted });
      currentSegment = text[i];
      currentHighlighted = isHighlighted;
    }
  }

  if (currentSegment) {
    segments.push({ text: currentSegment, highlighted: currentHighlighted });
  }

  return segments;
}
