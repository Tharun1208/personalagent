/**
 * Trie (Prefix Tree) Data Structure
 * Time Complexities:
 * - insert(word): O(L) where L is length of word
 * - search(word): O(L)
 * - startsWith(prefix): O(L)
 * - getSuggestions(prefix): O(L + K) where K is number of matched words
 */

export interface TrieNodeValue<T = any> {
  key: string;
  data?: T;
  description?: string;
  icon?: string;
}

class TrieNode<T> {
  public children: Map<string, TrieNode<T>> = new Map();
  public isEndOfWord: boolean = false;
  public item?: TrieNodeValue<T>;
}

export class Trie<T = any> {
  private root: TrieNode<T> = new TrieNode<T>();

  public insert(word: string, data?: T, description?: string, icon?: string): void {
    const normalized = word.toLowerCase().trim();
    if (!normalized) return;

    let current = this.root;
    for (const char of normalized) {
      if (!current.children.has(char)) {
        current.children.set(char, new TrieNode<T>());
      }
      current = current.children.get(char)!;
    }
    current.isEndOfWord = true;
    current.item = {
      key: word,
      data,
      description,
      icon,
    };
  }

  public search(word: string): TrieNodeValue<T> | null {
    const normalized = word.toLowerCase().trim();
    let current = this.root;
    for (const char of normalized) {
      if (!current.children.has(char)) {
        return null;
      }
      current = current.children.get(char)!;
    }
    return current.isEndOfWord ? (current.item || null) : null;
  }

  public getSuggestions(prefix: string, maxResults: number = 10): TrieNodeValue<T>[] {
    const normalized = prefix.toLowerCase().trim();
    let current = this.root;

    for (const char of normalized) {
      if (!current.children.has(char)) {
        return [];
      }
      current = current.children.get(char)!;
    }

    const results: TrieNodeValue<T>[] = [];
    this.collectWords(current, results, maxResults);
    return results;
  }

  private collectWords(node: TrieNode<T>, results: TrieNodeValue<T>[], maxResults: number): void {
    if (results.length >= maxResults) return;

    if (node.isEndOfWord && node.item) {
      results.push(node.item);
    }

    for (const child of node.children.values()) {
      this.collectWords(child, results, maxResults);
      if (results.length >= maxResults) break;
    }
  }
}
