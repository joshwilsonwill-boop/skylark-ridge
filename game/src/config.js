// Shared constants for Skylark Ridge: units are metres, metres per second and
// degrees. One place for every number the other files tune against.
export const STEP = 1 / 60;
export const SEED = 7;
export const WORLD = {
  runwayHalfLength: 500,
  runwayHalfWidth: 12,
  runwayHeading: 0,
  lakeX: 950,
  lakeZ: 620,
  lakeRadius: 260,
};
export const PLANE = {
  maxSpeed: 92,
  minSpeed: 24,
  stallSpeed: 30,
  cruiseSpeed: 62,
  maxPitchDeg: 24,
  maxRollDeg: 62,
  rollRate: 2.6,
  pitchRate: 1.9,
  turnRate: 0.55,
  climbFactor: 0.9,
  fuelBurnIdle: 0.1,
  fuelBurnFull: 0.5,
  ringRadius: 20,
  gearSpeedMax: 55,
  landSpeedMax: 52,
  landSinkMax: 4.5,
};
export const CAMERA = {
  backDistance: 17,
  upOffset: 5.5,
  fovHalfDeg: 29,
  rollFollow: 0.55,
};
export const COLORS = {
  skyTop: '#2f6fb4',
  skyMid: '#7db3e2',
  horizon: '#cfe4f2',
  haze: '#d8e6ef',
  sun: '#fff3c4',
};
