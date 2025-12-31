export class TtlCache<TKey, TValue> {
  private readonly map = new Map<
    TKey,
    {
      expiresAt: number
      value: TValue
    }
  >()

  constructor(private readonly ttlMs: number) {}

  get(key: TKey): TValue | undefined {
    const hit = this.map.get(key)
    if (!hit) return undefined

    if (Date.now() >= hit.expiresAt) {
      this.map.delete(key)
      return undefined
    }

    return hit.value
  }

  set(key: TKey, value: TValue) {
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs })
  }

  clear() {
    this.map.clear()
  }
}
