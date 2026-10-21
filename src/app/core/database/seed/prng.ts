export type Rng = () => number;

/** Small, fast, deterministic PRNG (mulberry32). */
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function int(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function pick<T>(rng: Rng, values: readonly T[]): T {
  if (values.length === 0) throw new Error('Cannot pick from an empty collection');
  return values[Math.floor(rng() * values.length)];
}

export function weighted<T>(
  rng: Rng,
  entries: readonly { readonly value: T; readonly weight: number }[]
): T {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let threshold = rng() * total;
  for (const entry of entries) {
    threshold -= entry.weight;
    if (threshold < 0) return entry.value;
  }
  return entries[entries.length - 1].value;
}

export function shuffled<T>(rng: Rng, values: readonly T[]): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
