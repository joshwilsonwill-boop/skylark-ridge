// Screenshot staging: each shot flies the real physics forward from a fresh
// state with a simple autopilot, so the frame is what a short flight really
// looks like, and the same seed always gives the same frame.
import { STEP } from './config.js';
import { createPlane, stepPlane, EVENT_RING } from './physics.js';
import { createMission, ringPoints } from './missions.js';

const DT = STEP;

/** Steer toward a point: returns stick input in [-1, 1] plus throttle. */
export function autopilot(plane, target, throttle) {
  const dx = target.x - plane.x;
  const dy = target.y - plane.y;
  const dz = target.z - plane.z;
  const wantHeading = Math.atan2(dz, dx);
  let diff = wantHeading - plane.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const roll = Math.max(-1, Math.min(1, diff * 1.6));
  const dist = Math.hypot(dx, dz);
  const wantAlt = target.y;
  const altErr = wantAlt - plane.y;
  const climbRate = Math.max(-8, Math.min(10, altErr * 0.12));
  const pitch = Math.max(-1, Math.min(1, climbRate / 12 + (dist < 120 ? 0.15 : 0)));
  return { pitch, roll, yaw: 0, throttle };
}

function flyFor(plane, mission, seconds, steer) {
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i += 1) {
    const input = steer(plane, mission);
    stepPlane(plane, DT, input, mission.def.wind, mission.rings, () => {
      mission.score += ringPoints(mission);
    });
    if (plane.crashed || plane.landed) break;
  }
  if (plane.airborne) plane.gearDown = false;
}

/**
 * Set up the named scene and return the game snapshot to draw: the plane,
 * the mission and the screen to paint over it. Names: cover, ring, land,
 * title. Any other name is the cover.
 */
export function stageShot(name, time) {
  if (name === 'land') {
    const plane = createPlane();
    const mission = createMission(0);
    let score = 0;
    mission.rings.forEach((r, i) => {
      r.passed = true;
      score += 100 + i * 25;
    });
    mission.score = score;
    plane.x = -900;
    plane.y = 95;
    plane.z = 0;
    plane.heading = 0;
    plane.speed = 46;
    plane.throttle = 0.35;
    plane.airborne = true;
    plane.gearDown = true;
    flyFor(plane, mission, 9, (p) => autopilot(p, { x: 200, y: 12, z: 0 }, 0.35));
    plane.gearDown = true;
    return { plane, mission, screen: 'play', message: 'FINAL APPROACH: RUNWAY 27' };
  }
  if (name === 'ring') {
    const plane = createPlane();
    const mission = createMission(0);
    let score = 0;
    mission.rings[0].passed = true;
    score += 100;
    mission.rings[1].passed = true;
    score += 125;
    mission.score = score;
    const ring = mission.rings[2];
    plane.x = ring.x - 260;
    plane.y = ring.y - 10;
    plane.z = ring.z + 60;
    plane.heading = Math.atan2(ring.z - plane.z, ring.x - plane.x);
    plane.speed = 68;
    plane.throttle = 0.8;
    plane.airborne = true;
    flyFor(plane, mission, 2.6, (p) => autopilot(p, ring, 0.8));
    return { plane, mission, screen: 'play', message: null };
  }
  if (name === 'title') {
    const plane = createPlane();
    const mission = createMission(0);
    plane.y = 160;
    plane.speed = 62;
    plane.throttle = 0.7;
    plane.airborne = true;
    flyFor(plane, mission, 12, (p, m) => {
      const ring = m.rings.find((r) => !r.passed);
      return autopilot(p, ring || { x: 0, y: 150, z: 0 }, 0.7);
    });
    return { plane, mission, screen: 'title', message: null };
  }
  const plane = createPlane();
  const mission = createMission(0);
  plane.throttle = 0.85;
  flyFor(plane, mission, 34, (p, m) => {
    const ring = m.rings.find((r) => !r.passed);
    return autopilot(p, ring || { x: 0, y: 150, z: 0 }, 0.85);
  });
  return { plane, mission, screen: 'play', message: null };
}

export { EVENT_RING };
