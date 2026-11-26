// Deterministic randomness: a small seeded generator and a value-noise field
// so the terrain is identical on every load and every screenshot run.

/** Mulberry32: a tiny seeded generator that returns values in [0, 1). */
export function createRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer lattice hash, stable for any (x, z) pair and seed. */
export function hash2(ix, iz, seed) {
  let h = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + Math.imul(seed, 974634211)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

/** Smooth value noise in [0, 1] at world scale `cell` metres. */
export function valueNoise(x, z, cell, seed) {
  const gx = x / cell;
  const gz = z / cell;
  const ix = Math.floor(gx);
  const iz = Math.floor(gz);
  const fx = smooth(gx - ix);
  const fz = smooth(gz - iz);
  const a = hash2(ix, iz, seed);
  const b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed);
  const d = hash2(ix + 1, iz + 1, seed);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

/** Three octaves of value noise, centred near zero, in roughly [-1, 1]. */
export function fbm(x, z, seed) {
  const n1 = valueNoise(x, z, 420, seed) * 2 - 1;
  const n2 = valueNoise(x, z, 170, seed + 11) * 2 - 1;
  const n3 = valueNoise(x, z, 68, seed + 23) * 2 - 1;
  return n1 * 0.55 + n2 * 0.3 + n3 * 0.15;
}
