/**
 * LRU (Least Recently Used) Cache
 * Implemented using Doubly Linked List + Hash Map
 * Time Complexities:
 * - get(key): O(1)
 * - put(key, value): O(1)
 * - has(key): O(1)
 * - delete(key): O(1)
 */

class DNode<K, V> {
  public key: K;
  public val: V;
  public prev: DNode<K, V> | null = null;
  public next: DNode<K, V> | null = null;
  public expiresAt?: number;

  constructor(key: K, val: V, expiresAt?: number) {
    this.key = key;
    this.val = val;
    this.expiresAt = expiresAt;
  }
}

export class LRUCache<K, V> {
  private capacity: number;
  private map: Map<K, DNode<K, V>> = new Map();
  private head: DNode<K, V>;
  private tail: DNode<K, V>;
  private ttlMs?: number;

  constructor(capacity: number = 100, ttlMs?: number) {
    this.capacity = capacity;
    this.ttlMs = ttlMs;
    // Sentinel dummy nodes to eliminate edge case null checks
    this.head = new DNode<K, V>(null as any, null as any);
    this.tail = new DNode<K, V>(null as any, null as any);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  public get(key: K): V | null {
    const node = this.map.get(key);
    if (!node) return null;

    if (node.expiresAt && Date.now() > node.expiresAt) {
      this.delete(key);
      return null;
    }

    // Move to front (most recently used)
    this.moveToHead(node);
    return node.val;
  }

  public put(key: K, value: V, customTtlMs?: number): void {
    const existing = this.map.get(key);
    const ttl = customTtlMs ?? this.ttlMs;
    const expiresAt = ttl ? Date.now() + ttl : undefined;

    if (existing) {
      existing.val = value;
      existing.expiresAt = expiresAt;
      this.moveToHead(existing);
      return;
    }

    if (this.map.size >= this.capacity) {
      const lru = this.tail.prev!;
      if (lru !== this.head) {
        this.removeNode(lru);
        this.map.delete(lru.key);
      }
    }

    const newNode = new DNode<K, V>(key, value, expiresAt);
    this.map.set(key, newNode);
    this.addNode(newNode);
  }

  public has(key: K): boolean {
    const node = this.map.get(key);
    if (!node) return false;
    if (node.expiresAt && Date.now() > node.expiresAt) {
      this.delete(key);
      return false;
    }
    return true;
  }

  public delete(key: K): boolean {
    const node = this.map.get(key);
    if (!node) return false;
    this.removeNode(node);
    this.map.delete(key);
    return true;
  }

  public size(): number {
    return this.map.size;
  }

  public clear(): void {
    this.map.clear();
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  private addNode(node: DNode<K, V>): void {
    node.prev = this.head;
    node.next = this.head.next;
    this.head.next!.prev = node;
    this.head.next = node;
  }

  private removeNode(node: DNode<K, V>): void {
    const prev = node.prev!;
    const next = node.next!;
    prev.next = next;
    next.prev = prev;
  }

  private moveToHead(node: DNode<K, V>): void {
    this.removeNode(node);
    this.addNode(node);
  }
}
