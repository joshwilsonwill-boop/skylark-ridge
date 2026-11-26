// The HUD: altitude, speed, heading compass, fuel and damage, score, ring
// progress, throttle, gear state, the attitude ball and the marker that
// points the pilot at the next ring. Drawn in canvas, lit and readable.
import { headingDeg } from './physics.js';
import { nextRing } from './missions.js';
import { heightAt } from './terrain.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8, 16, 24, 0.8)';
  ctx.strokeStyle = 'rgba(140, 220, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
}

function bar(ctx, x, y, w, h, frac, color) {
  const f = Math.max(0, Math.min(1, frac));
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 4);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w * f, h, 4);
  ctx.fill();
}

function compass(ctx, w, heading) {
  const cx = w / 2;
  const y = 14;
  ctx.fillStyle = 'rgba(8, 16, 24, 0.8)';
  ctx.beginPath();
  ctx.roundRect(cx - 170, y, 340, 34, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(140, 220, 255, 0.35)';
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - 170, y, 340, 34);
  ctx.clip();
  const labels = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
  for (let d = -60; d <= 420; d += 15) {
    const deg = ((d % 360) + 360) % 360;
    let diff = deg - heading;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    const x = cx + diff * 2.4;
    if (x < cx - 175 || x > cx + 175) continue;
    const major = deg % 45 === 0;
    ctx.strokeStyle = major ? '#cfe8ff' : 'rgba(207, 232, 255, 0.5)';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 8);
    ctx.lineTo(x, y + (major ? 20 : 15));
    ctx.stroke();
    if (major) {
      ctx.fillStyle = '#eaf6ff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(labels[deg] || String(deg), x, y + 21);
    }
  }
  ctx.restore();
  ctx.fillStyle = '#ffd34d';
  ctx.beginPath();
  ctx.moveTo(cx - 6, y + 2);
  ctx.lineTo(cx + 6, y + 2);
  ctx.lineTo(cx, y + 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#eaf6ff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(`${String(Math.round(heading)).padStart(3, '0')} deg`, cx, y + 36);
}

function attitude(ctx, x, y, r, pitch, roll) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#3d7ab8';
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.translate(x, y);
  ctx.rotate(-roll);
  ctx.translate(0, pitch * r * 1.4);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(-r, 0, r * 2, r);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(r, 0);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(207, 232, 255, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffd34d';
  ctx.beginPath();
  ctx.moveTo(x - 12, y);
  ctx.lineTo(x + 12, y);
  ctx.lineTo(x, y + 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#eaf6ff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ATTITUDE', x, y + r + 13);
}

/**
 * Draw the full HUD over a frame. `view` is the renderer's projection info
 * so the next-ring marker can be placed in the world.
 */
export function drawHud(ctx, w, h, plane, mission, view, message) {
  const heading = headingDeg(plane);
  const agl = Math.max(0, Math.round(plane.y - heightAt(plane.x, plane.z)));
  const speedKmh = Math.round(plane.speed * 3.6);
  compass(ctx, w, heading);

  panel(ctx, 14, 14, 196, 108);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#9fd8ff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('ALTITUDE', 26, 22);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`${Math.round(plane.y)} m`, 26, 36);
  ctx.fillStyle = '#9fd8ff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('ABOVE GROUND', 26, 66);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`${agl} m`, 26, 80);
  ctx.fillStyle = '#9fd8ff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(`CLIMB ${plane.verticalSpeed >= 0 ? '+' : ''}${plane.verticalSpeed.toFixed(1)} m/s`, 26, 102);

  panel(ctx, 14, 132, 196, 86);
  ctx.fillStyle = '#9fd8ff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('AIRSPEED', 26, 140);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`${speedKmh} km/h`, 26, 154);
  ctx.fillStyle = '#9fd8ff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(`HEADING ${String(heading).padStart(3, '0')} deg`, 26, 188);
  ctx.fillText(`THROTTLE ${Math.round(plane.throttle * 100)}%`, 26, 202);

  const passed = mission.rings.filter((r) => r.passed).length;
  panel(ctx, w - 210, 14, 196, 108);
  ctx.fillStyle = '#9fd8ff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('SCORE', w - 198, 22);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(String(mission.score), w - 198, 36);
  ctx.fillStyle = '#9fd8ff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(`RINGS ${passed} / ${mission.rings.length}`, w - 198, 66);
  ctx.fillText(`MISSION ${mission.def.id}: ${mission.def.name.toUpperCase()}`, w - 198, 80);
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 12px sans-serif';
  const ring = nextRing(mission);
  ctx.fillText(ring ? `NEXT: RING ${ring.label}` : 'ALL RINGS CLEAR: LAND', w - 198, 98);

  panel(ctx, w - 210, 132, 196, 86);
  ctx.fillStyle = '#9fd8ff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('FUEL', w - 198, 140);
  bar(ctx, w - 198, 156, 172, 12, plane.fuel / 100, plane.fuel > 25 ? '#4fc94f' : '#ff5a3c');
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`${Math.round(plane.fuel)}%`, w - 198, 172);
  ctx.fillStyle = '#9fd8ff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(`GEAR ${plane.gearDown ? 'DOWN' : 'UP'}`, w - 198, 196);
  if (plane.damage > 0) {
    ctx.fillStyle = '#ff5a3c';
    ctx.fillText(`DAMAGE ${Math.round(plane.damage)}%`, w - 120, 196);
  }

  attitude(ctx, 74, h - 84, 46, plane.pitch, plane.roll);

  bar(ctx, w - 40, h - 150, 16, 120, plane.throttle, '#ffd34d');
  ctx.fillStyle = '#eaf6ff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THR', w - 32, h - 158);

  if (view && ring) {
    const p = view.project(view.cam, view.basis, view.focal, view.cx, view.cy, ring.x, ring.y, ring.z);
    const dist = Math.round(Math.hypot(ring.x - plane.x, ring.y - plane.y, ring.z - plane.z));
    if (p) {
      ctx.strokeStyle = 'rgba(255, 211, 77, 0.95)';
      ctx.lineWidth = 2;
      const s = 14;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - s);
      ctx.lineTo(p.x + s, p.y);
      ctx.lineTo(p.x, p.y + s);
      ctx.lineTo(p.x - s, p.y);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = '#ffd34d';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${dist} m`, p.x, p.y - s - 18);
    } else {
      const dx = ring.x - plane.x;
      const dz = ring.z - plane.z;
      const ang = Math.atan2(dz, dx) - plane.heading;
      const ex = w / 2 + Math.cos(ang) * (w / 2 - 60);
      const ey = h / 2 - Math.sin(ang) * (h / 2 - 60);
      ctx.fillStyle = '#ffd34d';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('>', ex, ey);
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`RING ${ring.label} ${dist} m`, ex, ey + 22);
    }
  }

  if (message) {
    ctx.font = 'bold 24px sans-serif';
    const tw = ctx.measureText(message).width;
    panel(ctx, w / 2 - tw / 2 - 18, 92, tw + 36, 42);
    ctx.fillStyle = '#ffd34d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, w / 2, 113);
  }
}
