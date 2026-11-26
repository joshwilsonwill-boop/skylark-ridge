// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. Screens: title,
// play, paused, landed and crashed. Missions are picked on the title screen.
//
// ?shot=cover|ring|land|title stages that scene instead of running the loop,
// paints it twice and sets window.__shotReady for a screenshot.
import { STEP } from './config.js';
import { createPlane, stepPlane, EVENT_RING, EVENT_LANDED, EVENT_CRASHED, EVENT_FUEL_EMPTY } from './physics.js';
import { createMission, nextRing, ringPoints, landingBonus, MISSIONS } from './missions.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_RESTART, ACTION_NEXT_MISSION, createInput } from './input.js';
import { createRenderer } from './render.js';
import { drawHud } from './hud.js';
import { stageShot, autopilot } from './shots.js';
import { createAudio } from './audio.js';

const MAX_FRAME = 0.25;
const BEST_KEY = 'skylark-ridge-best';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: the best score then lasts this visit only.
  }
}

function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.floor(canvas.clientWidth * dpr);
  const h = Math.floor(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

function runShot(name) {
  fitCanvas();
  const scene = stageShot(name, 0);
  const ctx = canvas.getContext('2d');
  let painted = 0;
  function paint() {
    fitCanvas();
    const view = renderer.drawWorld(scene.plane, scene.mission, 2.4);
    if (scene.screen === 'play') {
      drawHud(ctx, canvas.width, canvas.height, scene.plane, scene.mission, view, scene.message);
    } else {
      drawTitle(ctx, canvas.width, canvas.height, 0, scene.plane, scene.mission);
    }
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function drawTitle(ctx, w, h, missionIndex, plane, mission) {
  ctx.fillStyle = 'rgba(8, 16, 24, 0.45)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffd34d';
  ctx.font = `bold ${Math.round(h * 0.075)}px sans-serif`;
  ctx.fillText('SKYLARK RIDGE', w / 2, h * 0.1);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(h * 0.028)}px sans-serif`;
  ctx.fillText('A bush flying game: rings, fuel and one runway home', w / 2, h * 0.1 + h * 0.085);
  const boxW = Math.min(620, w * 0.62);
  const boxX = (w - boxW) / 2;
  let y = h * 0.3;
  ctx.textAlign = 'left';
  for (let i = 0; i < MISSIONS.length; i += 1) {
    const m = MISSIONS[i];
    const selected = i === missionIndex;
    ctx.fillStyle = selected ? 'rgba(255, 211, 77, 0.22)' : 'rgba(8, 16, 24, 0.6)';
    ctx.strokeStyle = selected ? '#ffd34d' : 'rgba(140, 220, 255, 0.35)';
    ctx.lineWidth = selected ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(boxX, y, boxW, 64, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`${i + 1}. ${m.name}`, boxX + 16, y + 10);
    ctx.fillStyle = '#cfe8ff';
    ctx.font = '15px sans-serif';
    ctx.fillText(m.brief, boxX + 16, y + 38);
    y += 76;
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#eaf6ff';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Press 1, 2 or 3 to pick a mission, then Enter to fly', w / 2, y + 8);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#cfe8ff';
  ctx.fillText('Arrows fly the stick  |  W and S work the throttle  |  G lowers the gear  |  Mouse steers while held', w / 2, y + 36);
  ctx.fillText('Fly every ring, then land on runway 27. Mind the fuel and the hills.', w / 2, y + 60);
  if (readBest() > 0) {
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`Best score: ${readBest()}`, w / 2, y + 88);
  }
}

function drawEnd(ctx, w, h, title, lines, accent) {
  ctx.fillStyle = 'rgba(8, 16, 24, 0.55)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = accent;
  ctx.font = `bold ${Math.round(h * 0.06)}px sans-serif`;
  ctx.fillText(title, w / 2, h * 0.3);
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px sans-serif';
  let y = h * 0.3 + h * 0.09;
  for (const line of lines) {
    ctx.fillText(line, w / 2, y);
    y += 32;
  }
  ctx.fillStyle = '#cfe8ff';
  ctx.font = '16px sans-serif';
  ctx.fillText('Enter: fly again    M: mission list    R: restart', w / 2, y + 16);
}

function runGame() {
  const input = createInput(canvas);
  let missionIndex = 0;
  let mission = createMission(missionIndex);
  let plane = createPlane();
  let screen = 'title';
  let best = readBest();
  let message = null;
  let messageUntil = 0;
  let accumulator = 0;
  let last = performance.now();
  let attractPlane = createPlane();
  let attractMission = createMission(0);
  attractPlane.airborne = true;
  attractPlane.speed = 62;
  attractPlane.throttle = 0.7;

  window.__skylark = {
    get screen() {
      return screen;
    },
    get plane() {
      return plane;
    },
    get mission() {
      return mission;
    },
    get score() {
      return mission.score;
    },
  };

  function announce(text) {
    status.textContent = text;
  }

  function showMessage(text, seconds) {
    message = text;
    messageUntil = performance.now() / 1000 + seconds;
  }

  function startMission(index) {
    missionIndex = index;
    mission = createMission(index);
    plane = createPlane();
    input.setThrottle(0);
    screen = 'play';
    showMessage(`MISSION ${mission.def.id}: ${mission.def.name.toUpperCase()}`, 4);
    announce(`Flying mission ${mission.def.name}.`);
  }

  function endFlight(landed) {
    if (landed) {
      screen = 'landed';
      const bonus = landingBonus(plane.fuel);
      mission.score += bonus;
      mission.complete = true;
      audio.land();
      announce(`Landed. Score ${mission.score}.`);
    } else {
      screen = 'crashed';
      audio.crash();
      announce(`Crashed. Score ${mission.score}.`);
    }
    if (mission.score > best) {
      best = mission.score;
      saveBest(best);
    }
  }

  function step() {
    if (screen === 'title') {
      const ring = nextRing(attractMission);
      const steer = autopilot(attractPlane, ring || { x: 0, y: 150, z: 0 }, 0.7);
      stepPlane(attractPlane, STEP, steer, attractMission.def.wind, attractMission.rings, null);
      if (attractPlane.crashed || attractPlane.landed || !nextRing(attractMission)) {
        attractMission = createMission(missionIndex);
        attractPlane = createPlane();
        attractPlane.airborne = true;
        attractPlane.speed = 62;
        attractPlane.throttle = 0.7;
      }
      return;
    }
    if (screen !== 'play') return;
    if (input.takeGearToggle()) {
      plane.gearDown = !plane.gearDown;
      showMessage(plane.gearDown ? 'GEAR DOWN' : 'GEAR UP', 2);
    }
    const stick = input.read();
    const events = stepPlane(plane, STEP, stick, mission.def.wind, mission.rings, (i) => {
      const pts = ringPoints(mission);
      mission.score += pts;
      mission.ringsScore += pts;
      showMessage(`RING ${i + 1} CLEAR  +${pts}`, 2.5);
      audio.ring();
    });
    mission.elapsed += STEP;
    if (events & EVENT_RING && !nextRing(mission)) {
      showMessage('ALL RINGS CLEAR: LAND ON RUNWAY 27', 4);
    }
    if (events & EVENT_FUEL_EMPTY) showMessage('FUEL EMPTY: GLIDE TO THE RUNWAY', 4);
    if (events & EVENT_LANDED) endFlight(true);
    else if (events & EVENT_CRASHED) endFlight(false);
    audio.update(plane.throttle, Math.min(1, plane.speed / 92));
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      audio.click();
      if (screen === 'title') startMission(missionIndex);
      else if (screen === 'landed' || screen === 'crashed') startMission(missionIndex);
      else if (screen === 'paused') screen = 'play';
    }
    if (actions & ACTION_PAUSE) {
      if (screen === 'play') {
        screen = 'paused';
        announce('Paused.');
      } else if (screen === 'paused') {
        screen = 'play';
        announce('Playing.');
      }
    }
    if (actions & ACTION_RESTART) {
      if (screen === 'play' || screen === 'landed' || screen === 'crashed') startMission(missionIndex);
    }
    if (actions & ACTION_NEXT_MISSION) {
      if (screen === 'title' || screen === 'landed' || screen === 'crashed') {
        missionIndex = (missionIndex + 1) % MISSIONS.length;
        if (screen !== 'title') screen = 'title';
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    fitCanvas();
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    while (accumulator >= STEP && (screen === 'title' || screen === 'play')) {
      step();
      accumulator -= STEP;
    }
    if (screen !== 'title' && screen !== 'play') accumulator = 0;
    const ctx = canvas.getContext('2d');
    const nowSec = now / 1000;
    const msg = message && nowSec < messageUntil ? message : null;
    if (screen === 'title') {
      renderer.drawWorld(attractPlane, attractMission, nowSec);
      drawTitle(ctx, canvas.width, canvas.height, missionIndex, attractPlane, attractMission);
    } else {
      const view = renderer.drawWorld(plane, mission, nowSec);
      drawHud(ctx, canvas.width, canvas.height, plane, mission, view, msg);
      if (screen === 'paused') {
        drawEnd(ctx, canvas.width, canvas.height, 'PAUSED', ['Take a breath. The valley will wait.'], '#eaf6ff');
      } else if (screen === 'landed') {
        const passed = mission.rings.filter((r) => r.passed).length;
        drawEnd(ctx, canvas.width, canvas.height, 'MISSION COMPLETE', [
          `${mission.def.name}: ${passed} of ${mission.rings.length} rings, landed clean.`,
          `Score ${mission.score}   Best ${best}   Fuel left ${Math.round(plane.fuel)}%`,
        ], '#4fc94f');
      } else if (screen === 'crashed') {
        const passed = mission.rings.filter((r) => r.passed).length;
        drawEnd(ctx, canvas.width, canvas.height, 'CRASHED', [
          `The Skylark is down after ${passed} of ${mission.rings.length} rings.`,
          `Score ${mission.score}   Best ${best}`,
          'Slow down, lower the gear, and mind the hills next time.',
        ], '#ff5a3c');
      }
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'play') {
      screen = 'paused';
      announce('Paused.');
    }
  });

  canvas.addEventListener('mousedown', () => audio.unlock());
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Digit1' || event.code === 'Digit2' || event.code === 'Digit3') {
      missionIndex = Number(event.code.slice(-1)) - 1;
      if (screen === 'landed' || screen === 'crashed') screen = 'title';
    }
  });

  announce('Skylark Ridge. Pick a mission and press Enter to fly.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
