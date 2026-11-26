// The three sorties of the Skylark Ridge campaign: each is a ring route over
// the valley that ends with a landing back on the home runway. Rings are
// placed by hand so the route reads as a tour: valley, lake, ridges, home.
export const MISSIONS = [
  {
    id: 1,
    name: 'First Solo',
    brief: 'Five rings over the home valley, then land on runway 27.',
    wind: { x: 0, z: 0 },
    timeOfDay: 'morning',
    rings: [
      { x: 250, y: 130, z: -260 },
      { x: 700, y: 170, z: -420 },
      { x: 1050, y: 190, z: -120 },
      { x: 900, y: 170, z: 320 },
      { x: 350, y: 140, z: 380 },
    ],
  },
  {
    id: 2,
    name: 'Ridge Courier',
    brief: 'Seven rings: out to the lake, over the high ridge, home to land.',
    wind: { x: 2.5, z: -1.5 },
    timeOfDay: 'afternoon',
    rings: [
      { x: 300, y: 150, z: -350 },
      { x: 800, y: 200, z: -550 },
      { x: 950, y: 170, z: 420 },
      { x: 1250, y: 210, z: 700 },
      { x: 600, y: 230, z: 850 },
      { x: -100, y: 180, z: 700 },
      { x: -350, y: 150, z: 250 },
    ],
  },
  {
    id: 3,
    name: 'Storm Return',
    brief: 'Eight rings in a stiff crosswind. Watch the fuel gauge.',
    wind: { x: -4, z: 3 },
    timeOfDay: 'dusk',
    rings: [
      { x: 200, y: 140, z: 300 },
      { x: -300, y: 180, z: 550 },
      { x: -700, y: 220, z: 200 },
      { x: -900, y: 240, z: -350 },
      { x: -400, y: 210, z: -700 },
      { x: 300, y: 200, z: -650 },
      { x: 900, y: 190, z: -300 },
      { x: 500, y: 150, z: 200 },
    ],
  },
];

/** A live mission: ring objects with passed flags plus scoring state. */
export function createMission(index) {
  const def = MISSIONS[index % MISSIONS.length];
  let prev = { x: -460, y: 60, z: 0 };
  const rings = def.rings.map((r, i) => {
    const dx = r.x - prev.x;
    const dy = r.y - prev.y;
    const dz = r.z - prev.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    const ring = {
      x: r.x,
      y: r.y,
      z: r.z,
      radius: 20,
      label: i + 1,
      normal: { x: dx / len, y: dy / len, z: dz / len },
      passed: false,
    };
    prev = r;
    return ring;
  });
  return {
    def,
    index: index % MISSIONS.length,
    rings,
    score: 0,
    ringsScore: 0,
    startTime: 0,
    elapsed: 0,
    complete: false,
  };
}

/** The next ring the pilot must fly through, or null when all are passed. */
export function nextRing(mission) {
  for (let i = 0; i < mission.rings.length; i += 1) {
    if (!mission.rings[i].passed) return mission.rings[i];
  }
  return null;
}

/** Points for a ring pass: 100, plus 25 for each ring already passed in a row. */
export function ringPoints(mission) {
  const passed = mission.rings.filter((r) => r.passed).length;
  return 100 + (passed - 1) * 25;
}

/** Landing bonus: 200 base plus 2 per percent of fuel left. */
export function landingBonus(fuel) {
  return 200 + Math.round(fuel) * 2;
}
