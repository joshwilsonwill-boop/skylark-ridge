// The world renderer: sky, sun and clouds, a painter-sorted terrain grid,
// the runway strip, the target rings and the aircraft shadow. All drawing is
// procedural canvas work from the height field; nothing is loaded.
import { CAMERA, COLORS, WORLD } from './config.js';
import { heightAt, quadColor, onRunway } from './terrain.js';
import { drawAircraft } from './aircraft.js';

const GRID_STEP = 55;
const GRID_AHEAD = 26;
const GRID_SIDE = 13;
const FOG_FAR = 1500;

const CLOUDS = [
  { x: -400, y: 420, z: -900, r: 130 },
  { x: 300, y: 480, z: -1400, r: 180 },
  { x: 1100, y: 400, z: 300, r: 150 },
  { x: -1000, y: 460, z: 600, r: 170 },
  { x: 100, y: 520, z: 1400, r: 200 },
  { x: 1600, y: 440, z: -800, r: 140 },
  { x: -1600, y: 430, z: -300, r: 150 },
  { x: 600, y: 500, z: 1100, r: 120 },
];

/** Camera basis vectors from a heading and pitch. */
export function cameraBasis(heading, pitch) {
  const cp = Math.cos(pitch);
  const fwd = { x: Math.cos(heading) * cp, y: Math.sin(pitch), z: Math.sin(heading) * cp };
  const right = { x: -fwd.z, y: 0, z: fwd.x };
  const rl = Math.hypot(right.x, right.z) || 1;
  right.x /= rl;
  right.z /= rl;
  const up = {
    x: -right.z * fwd.y,
    y: right.z * fwd.x - right.x * fwd.z,
    z: right.x * fwd.y,
  };
  return { fwd, right, up };
}

/** Project a world point into screen space; null when behind the camera. */
export function project(cam, basis, focal, cx, cy, px, py, pz) {
  const dx = px - cam.x;
  const dy = py - cam.y;
  const dz = pz - cam.z;
  const zc = dx * basis.fwd.x + dy * basis.fwd.y + dz * basis.fwd.z;
  if (zc < 2) return null;
  const xc = dx * basis.right.x + dy * basis.right.y + dz * basis.right.z;
  const yc = dx * basis.up.x + dy * basis.up.y + dz * basis.up.z;
  return { x: cx + (xc / zc) * focal, y: cy - (yc / zc) * focal, d: zc };
}

function duskFactor(timeOfDay) {
  return timeOfDay === 'dusk' ? 0.72 : timeOfDay === 'afternoon' ? 0.92 : 1;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function drawSky(w, h, pitch, timeOfDay) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    if (timeOfDay === 'dusk') {
      g.addColorStop(0, '#3a4a7a');
      g.addColorStop(0.45, '#c97e4e');
      g.addColorStop(0.62, '#e8b07e');
      g.addColorStop(1, '#5a6a72');
    } else if (timeOfDay === 'afternoon') {
      g.addColorStop(0, '#2a63a8');
      g.addColorStop(0.55, '#8fbde8');
      g.addColorStop(0.72, '#d8e8f2');
      g.addColorStop(1, '#a8b8a0');
    } else {
      g.addColorStop(0, COLORS.skyTop);
      g.addColorStop(0.55, COLORS.skyMid);
      g.addColorStop(0.72, COLORS.horizon);
      g.addColorStop(1, '#9aa88e');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const horizonY = h * 0.5 - pitch * h * 0.9;
    const sunX = w * 0.78;
    const sunY = Math.max(40, horizonY - h * 0.22);
    const sun = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 90);
    sun.addColorStop(0, COLORS.sun);
    sun.addColorStop(0.35, 'rgba(255, 240, 180, 0.55)');
    sun.addColorStop(1, 'rgba(255, 240, 180, 0)');
    ctx.fillStyle = sun;
    ctx.fillRect(sunX - 100, sunY - 100, 200, 200);
    ctx.fillStyle = 'rgba(255, 250, 225, 0.95)';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawClouds(cam, basis, focal, cx, cy, timeOfDay) {
    ctx.save();
    for (const c of CLOUDS) {
      const p = project(cam, basis, focal, cx, cy, c.x, c.y, c.z);
      if (!p || p.d > 2600) continue;
      const scale = focal / p.d;
      const r = c.r * scale;
      const alpha = Math.max(0, Math.min(0.85, 1.1 - p.d / 2200));
      ctx.fillStyle = timeOfDay === 'dusk' ? `rgba(240, 200, 170, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r, r * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(p.x - r * 0.5, p.y + r * 0.08, r * 0.6, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(p.x + r * 0.55, p.y + r * 0.06, r * 0.55, r * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawTerrain(cam, basis, focal, cx, cy) {
    const pts = [];
    for (let j = 0; j <= GRID_AHEAD; j += 1) {
      for (let i = -GRID_SIDE; i <= GRID_SIDE; i += 1) {
        const ahead = 40 + j * GRID_STEP;
        const side = i * GRID_STEP;
        const wx = cam.x + basis.fwd.x * ahead + basis.right.x * side;
        const wz = cam.z + basis.fwd.z * ahead + basis.right.z * side;
        const wy = heightAt(wx, wz);
        const p = project(cam, basis, focal, cx, cy, wx, wy, wz);
        pts.push(p);
      }
    }
    const cols = GRID_SIDE * 2 + 1;
    for (let j = GRID_AHEAD - 1; j >= 0; j -= 1) {
      for (let i = 0; i < cols - 1; i += 1) {
        const a = pts[j * cols + i];
        const b = pts[j * cols + i + 1];
        const c = pts[(j + 1) * cols + i + 1];
        const d = pts[(j + 1) * cols + i];
        if (!a || !b || !c || !d) continue;
        const ahead = 40 + j * GRID_STEP;
        const side = (i - GRID_SIDE) * GRID_STEP;
        const wx = cam.x + basis.fwd.x * ahead + basis.right.x * side;
        const wz = cam.z + basis.fwd.z * ahead + basis.right.z * side;
        const wy = heightAt(wx, wz);
        const dist = Math.hypot(ahead, side);
        ctx.fillStyle = quadColor(wx, wz, wy, dist, FOG_FAR);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.lineTo(c.x, c.y);
        ctx.lineTo(d.x, d.y);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function drawRunway(cam, basis, focal, cx, cy) {
    const step = 50;
    for (let x = -WORLD.runwayHalfLength; x < WORLD.runwayHalfLength; x += step) {
      const x2 = Math.min(WORLD.runwayHalfLength, x + step);
      const p1 = project(cam, basis, focal, cx, cy, x, 0.35, -WORLD.runwayHalfWidth);
      const p2 = project(cam, basis, focal, cx, cy, x2, 0.35, -WORLD.runwayHalfWidth);
      const p3 = project(cam, basis, focal, cx, cy, x2, 0.35, WORLD.runwayHalfWidth);
      const p4 = project(cam, basis, focal, cx, cy, x, 0.35, WORLD.runwayHalfWidth);
      if (!p1 || !p2 || !p3 || !p4) continue;
      const mid = (p1.d + p3.d) / 2;
      const fade = Math.max(0, Math.min(1, 1 - mid / FOG_FAR));
      ctx.fillStyle = `rgba(58, 63, 70, ${0.55 + 0.45 * fade})`;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.closePath();
      ctx.fill();
      if (Math.round(x / step) % 2 === 0) {
        const c1 = project(cam, basis, focal, cx, cy, x + 6, 0.4, -1.2);
        const c2 = project(cam, basis, focal, cx, cy, x + 30, 0.4, -1.2);
        const c3 = project(cam, basis, focal, cx, cy, x + 30, 0.4, 1.2);
        const c4 = project(cam, basis, focal, cx, cy, x + 6, 0.4, 1.2);
        if (c1 && c2 && c3 && c4) {
          ctx.fillStyle = `rgba(245, 245, 240, ${fade})`;
          ctx.beginPath();
          ctx.moveTo(c1.x, c1.y);
          ctx.lineTo(c2.x, c2.y);
          ctx.lineTo(c3.x, c3.y);
          ctx.lineTo(c4.x, c4.y);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    const num = project(cam, basis, focal, cx, cy, -WORLD.runwayHalfLength + 60, 0.5, 0);
    if (num && num.d < 1200) {
      const size = Math.max(10, Math.min(64, (focal / num.d) * 14));
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = `bold ${Math.round(size)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('27', num.x, num.y);
    }
  }

  function drawRing(cam, basis, focal, cx, cy, ring, isNext, time) {
    if (ring.passed && !isNext) {
      return;
    }
    const normal = ring.normal || { x: 1, y: 0, z: 0 };
    let ux = 0;
    let uy = 1;
    let uz = 0;
    const dot = normal.x * ux + normal.y * uy + normal.z * uz;
    ux -= normal.x * dot;
    uy -= normal.y * dot;
    uz -= normal.z * dot;
    const ul = Math.hypot(ux, uy, uz) || 1;
    ux /= ul;
    uy /= ul;
    uz /= ul;
    const vx = normal.y * uz - normal.z * uy;
    const vy = normal.z * ux - normal.x * uz;
    const vz = normal.x * uy - normal.y * ux;
    const pts = [];
    const segments = 24;
    for (let i = 0; i <= segments; i += 1) {
      const a = (i / segments) * Math.PI * 2;
      const ca = Math.cos(a) * ring.radius;
      const sa = Math.sin(a) * ring.radius;
      const px = ring.x + ux * ca + vx * sa;
      const py = ring.y + uy * ca + vy * sa;
      const pz = ring.z + uz * ca + vz * sa;
      const p = project(cam, basis, focal, cx, cy, px, py, pz);
      if (p) pts.push(p);
    }
    if (pts.length < 8) return;
    const centre = project(cam, basis, focal, cx, cy, ring.x, ring.y, ring.z);
    if (!centre) return;
    const pulse = isNext ? 0.75 + Math.sin(time * 4) * 0.25 : 0.4;
    ctx.save();
    ctx.strokeStyle = ring.passed
      ? `rgba(120, 220, 120, ${pulse})`
      : isNext
        ? `rgba(255, 176, 32, ${pulse})`
        : `rgba(255, 120, 60, ${pulse * 0.8})`;
    ctx.lineWidth = Math.max(2, Math.min(10, (focal / centre.d) * 1.6));
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    if (isNext) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.font = `bold ${Math.max(13, Math.min(22, Math.round((focal / centre.d) * 4)))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`RING ${ring.label}`, centre.x, centre.y - (focal / centre.d) * ring.radius - 8);
    }
  }

  function drawShadow(cam, basis, focal, cx, cy, plane) {
    const ground = heightAt(plane.x, plane.z);
    const agl = Math.max(0, plane.y - ground);
    if (agl > 260) return;
    const p = project(cam, basis, focal, cx, cy, plane.x, ground + 0.6, plane.z);
    if (!p) return;
    const scale = (focal / p.d) * (1 - agl / 320);
    ctx.fillStyle = `rgba(20, 30, 20, ${Math.max(0.05, 0.32 - agl / 800)})`;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, Math.max(2, 16 * scale), Math.max(1, 5 * scale), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Draw the world for a plane state: sky, clouds, terrain, runway, rings,
   * shadow and the chase-view aircraft. `time` is the wall clock in seconds.
   */
  function drawWorld(plane, mission, time) {
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const focal = (h / 2) / Math.tan((CAMERA.fovHalfDeg * Math.PI) / 180);
    const lookPitch = plane.pitch * 0.7;
    const basis = cameraBasis(plane.heading, lookPitch);
    const cam = {
      x: plane.x - Math.cos(plane.heading) * CAMERA.backDistance,
      y: plane.y + CAMERA.upOffset - Math.sin(plane.pitch) * 6,
      z: plane.z - Math.sin(plane.heading) * CAMERA.backDistance,
    };
    const timeOfDay = mission ? mission.def.timeOfDay : 'morning';
    drawSky(w, h, lookPitch, timeOfDay);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-plane.roll * CAMERA.rollFollow);
    ctx.translate(-cx, -cy);
    drawClouds(cam, basis, focal, cx, cy, timeOfDay);
    drawTerrain(cam, basis, focal, cx, cy);
    drawRunway(cam, basis, focal, cx, cy);
    if (mission) {
      const rings = mission.rings;
      const next = rings.find((r) => !r.passed) || null;
      const sorted = [...rings].sort((a, b) => {
        const da = Math.hypot(a.x - plane.x, a.y - plane.y, a.z - plane.z);
        const db = Math.hypot(b.x - plane.x, b.y - plane.y, b.z - plane.z);
        return db - da;
      });
      for (const ring of sorted) {
        drawRing(cam, basis, focal, cx, cy, ring, ring === next, time);
      }
    }
    drawShadow(cam, basis, focal, cx, cy, plane);
    ctx.restore();
    drawAircraft(ctx, w, h, plane, time);
    return { cam, basis, focal, cx, cy, project };
  }

  return { drawWorld, project, cameraBasis };
}
