// The aircraft: arcade flight physics with throttle, pitch, roll and yaw,
// stall and sink, fuel burn, damage, ring passes and landing judgement.
import { PLANE, WORLD } from './config.js';
import { heightAt, onRunway } from './terrain.js';

export const EVENT_NONE = 0;
export const EVENT_RING = 1;
export const EVENT_LANDED = 2;
export const EVENT_CRASHED = 4;
export const EVENT_FUEL_EMPTY = 8;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** A fresh aircraft sitting on the runway threshold, ready to roll. */
export function createPlane() {
  return {
    x: -WORLD.runwayHalfLength + 40,
    y: 0.5,
    z: 0,
    heading: 0,
    pitch: 0,
    roll: 0,
    speed: 0,
    throttle: 0,
    fuel: 100,
    damage: 0,
    gearDown: true,
    airborne: false,
    verticalSpeed: 0,
    time: 0,
    ringsPassed: 0,
    landed: false,
    crashed: false,
  };
}

export function planeState(plane) {
  return {
    x: plane.x,
    y: plane.y,
    z: plane.z,
    heading: plane.heading,
    pitch: plane.pitch,
    roll: plane.roll,
    speed: plane.speed,
    throttle: plane.throttle,
    fuel: plane.fuel,
    damage: plane.damage,
    gearDown: plane.gearDown,
    airborne: plane.airborne,
    verticalSpeed: plane.verticalSpeed,
    ringsPassed: plane.ringsPassed,
    landed: plane.landed,
    crashed: plane.crashed,
  };
}

/**
 * One physics step. `input` holds pitch, roll and yaw in [-1, 1] and a
 * throttle in [0, 1]; `wind` is {x, z} in metres per second. Returns an
 * event bitmask. `onRing` is called with the ring index when one is passed.
 */
export function stepPlane(plane, dt, input, wind, rings, onRing) {
  if (plane.landed || plane.crashed) return EVENT_NONE;
  let events = EVENT_NONE;
  plane.time += dt;

  const targetThrottle = plane.fuel > 0 ? clamp(input.throttle, 0, 1) : 0;
  plane.throttle += clamp(targetThrottle - plane.throttle, -dt * 0.8, dt * 0.8);
  const targetSpeed = 8 + plane.throttle * (PLANE.maxSpeed - 8);
  plane.speed += (targetSpeed - plane.speed) * Math.min(1, dt * 0.55);

  const targetRoll = clamp(input.roll, -1, 1) * (PLANE.maxRollDeg * Math.PI / 180);
  plane.roll += clamp(targetRoll - plane.roll, -PLANE.rollRate * dt, PLANE.rollRate * dt);
  const targetPitch = clamp(input.pitch, -1, 1) * (PLANE.maxPitchDeg * Math.PI / 180);
  plane.pitch += clamp(targetPitch - plane.pitch, -PLANE.pitchRate * dt, PLANE.pitchRate * dt);

  plane.heading = wrapAngle(
    plane.heading + Math.sin(plane.roll) * PLANE.turnRate * (plane.speed / PLANE.cruiseSpeed) * dt
      + clamp(input.yaw, -1, 1) * 0.35 * dt,
  );

  const lift = clamp(plane.speed / PLANE.cruiseSpeed, 0, 1.4);
  let climb = Math.sin(plane.pitch) * plane.speed * PLANE.climbFactor * lift;
  if (plane.speed < PLANE.stallSpeed && plane.airborne) {
    climb -= (PLANE.stallSpeed - plane.speed) * 0.35;
  }
  if (!plane.airborne && plane.speed < PLANE.minSpeed) climb = 0;
  plane.verticalSpeed = climb;

  const ground = heightAt(plane.x, plane.z);
  const fx = Math.cos(plane.heading) * Math.cos(plane.pitch);
  const fz = Math.sin(plane.heading) * Math.cos(plane.pitch);
  plane.x += (fx * plane.speed + wind.x) * dt;
  plane.z += (fz * plane.speed + wind.z) * dt;
  plane.y += climb * dt;

  if (!plane.airborne && plane.y > ground + 2) plane.airborne = true;
  if (plane.airborne && plane.y <= ground + 0.5) plane.y = ground + 0.5;

  plane.fuel = Math.max(0, plane.fuel - (PLANE.fuelBurnIdle + plane.throttle * PLANE.fuelBurnFull) * dt);
  if (plane.fuel <= 0 && plane.airborne) events |= EVENT_FUEL_EMPTY;

  for (let i = 0; i < rings.length; i += 1) {
    const ring = rings[i];
    if (ring.passed) continue;
    const dx = plane.x - ring.x;
    const dy = plane.y - ring.y;
    const dz = plane.z - ring.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < PLANE.ringRadius) {
      ring.passed = true;
      plane.ringsPassed += 1;
      events |= EVENT_RING;
      if (onRing) onRing(i);
    }
  }

  const agl = plane.y - ground;
  if (plane.airborne && agl <= 0.6) {
    const onStrip = onRunway(plane.x, plane.z);
    const gentle = plane.verticalSpeed > -PLANE.landSinkMax && plane.speed <= PLANE.landSpeedMax;
    if (onStrip && gentle && plane.gearDown) {
      plane.landed = true;
      plane.y = ground + 0.5;
      plane.speed = 0;
      events |= EVENT_LANDED;
    } else if (onStrip && gentle && !plane.gearDown) {
      plane.crashed = true;
      plane.damage = 100;
      events |= EVENT_CRASHED;
    } else if (onStrip && !gentle) {
      plane.crashed = true;
      plane.damage = 100;
      events |= EVENT_CRASHED;
    } else {
      plane.crashed = true;
      plane.damage = 100;
      events |= EVENT_CRASHED;
    }
  }
  if (!plane.airborne && plane.y <= ground + 0.5 && plane.speed > 0.5 && !onRunway(plane.x, plane.z)) {
    plane.crashed = true;
    plane.damage = 100;
    events |= EVENT_CRASHED;
  }
  return events;
}

/** Heading in whole compass degrees: 0 is north, 90 is east, 180 is south. */
export function headingDeg(plane) {
  const mathDeg = (plane.heading * 180) / Math.PI;
  const compass = ((mathDeg + 90) % 360 + 360) % 360;
  return Math.round(compass);
}
