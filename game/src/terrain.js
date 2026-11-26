// The valley: rolling hills, a flat runway corridor, a lake, and the colour
// rules that turn a height into fields, forest, rock and snow.
import { SEED, WORLD } from './config.js';
import { fbm, valueNoise } from './random.js';

/** Distance in the ground plane from (x, z) to the runway centreline segment. */
export function distanceToRunway(x, z) {
  const cx = Math.max(-WORLD.runwayHalfLength, Math.min(WORLD.runwayHalfLength, x));
  const dx = x - cx;
  const dz = z;
  return Math.hypot(dx, dz);
}

/** True when (x, z) lies inside the lake disc. */
export function isLake(x, z) {
  const dx = x - WORLD.lakeX;
  const dz = z - WORLD.lakeZ;
  return dx * dx + dz * dz < WORLD.lakeRadius * WORLD.lakeRadius;
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(a, b, v) {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** Ground height in metres at (x, z). The runway corridor is flat at zero. */
export function heightAt(x, z) {
  const dist = Math.hypot(x, z);
  const far = 1 + smoothstep(900, 2200, dist) * 1.6;
  let h = fbm(x, z, SEED) * 46 * far + valueNoise(x, z, 900, SEED + 5) * 26;
  const flat = smoothstep(46, 210, distanceToRunway(x, z));
  h *= flat;
  if (isLake(x, z)) h = Math.min(h, -3);
  return h;
}

/** True when the point is on the paved runway strip. */
export function onRunway(x, z) {
  return Math.abs(x) <= WORLD.runwayHalfLength && Math.abs(z) <= WORLD.runwayHalfWidth;
}

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const FIELD_A = [106, 168, 74];
const FIELD_B = [138, 178, 82];
const FOREST = [52, 104, 58];
const ROCK = [122, 116, 108];
const SNOW = [232, 236, 240];
const LAKE = [52, 122, 168];
const SAND = [198, 178, 128];

/**
 * Ground colour for a terrain quad at (x, z) with height h: patchwork fields
 * low down, forest on the slopes, rock then snow on the high ridges, blue
 * water on the lake and a sandy shore ring around it.
 */
export function groundColor(x, z, h) {
  if (isLake(x, z)) return LAKE;
  const shore = Math.hypot(x - WORLD.lakeX, z - WORLD.lakeZ);
  if (shore < WORLD.lakeRadius + 26) return SAND;
  const patch = valueNoise(x + 40, z - 17, 260, SEED + 31);
  let base = patch > 0.52 ? mix(FIELD_A, FIELD_B, (patch - 0.52) * 2) : FIELD_A;
  if (h > 26) base = mix(base, FOREST, smoothstep(26, 48, h));
  if (h > 58) base = mix(base, ROCK, smoothstep(58, 86, h));
  if (h > 108) base = mix(base, SNOW, smoothstep(108, 138, h));
  const shade = 0.92 + valueNoise(x, z, 90, SEED + 47) * 0.16;
  return [Math.round(base[0] * shade), Math.round(base[1] * shade), Math.round(base[2] * shade)];
}

/** CSS colour string for a terrain quad, faded toward haze with distance. */
export function quadColor(x, z, h, distance, fogFar) {
  const c = groundColor(x, z, h);
  const t = clamp01(distance / fogFar);
  const r = Math.round(c[0] + (216 - c[0]) * t * 0.75);
  const g = Math.round(c[1] + (230 - c[1]) * t * 0.75);
  const b = Math.round(c[2] + (239 - c[2]) * t * 0.75);
  return `rgb(${r},${g},${b})`;
}
