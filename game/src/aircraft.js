// The chase-view aircraft: a built bush plane seen from behind and slightly
// above, drawn procedurally with fuselage, wings, tail, canopy glass, prop
// spinner, wingtip lights and landing gear. It banks with the roll.
export function drawAircraft(ctx, w, h, plane, time) {
  const cx = w / 2;
  const baseY = h * 0.68 - plane.pitch * h * 0.22;
  const scale = 1 + Math.min(0.12, plane.speed / 800);
  ctx.save();
  ctx.translate(cx, baseY);
  ctx.rotate(-plane.roll);
  ctx.scale(scale, scale);

  const prop = Math.sin(time * 40) * 0.5 + 0.5;

  // Main wing: long, slightly swept, with tip lights.
  const wingGrad = ctx.createLinearGradient(0, -14, 0, 14);
  wingGrad.addColorStop(0, '#e8eef2');
  wingGrad.addColorStop(0.5, '#c3cfd8');
  wingGrad.addColorStop(1, '#8fa0ac');
  ctx.fillStyle = wingGrad;
  ctx.beginPath();
  ctx.moveTo(-118, 2);
  ctx.quadraticCurveTo(-70, -12, -16, -6);
  ctx.lineTo(16, -6);
  ctx.quadraticCurveTo(70, -12, 118, 2);
  ctx.quadraticCurveTo(118, 10, 70, 10);
  ctx.lineTo(-70, 10);
  ctx.quadraticCurveTo(-118, 10, -118, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#5d6b76';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Fuselage: tapered toward the nose (up-screen, away from the camera).
  const bodyGrad = ctx.createLinearGradient(-14, 0, 14, 0);
  bodyGrad.addColorStop(0, '#d94f2b');
  bodyGrad.addColorStop(0.35, '#f2f2ee');
  bodyGrad.addColorStop(0.65, '#e4e8ea');
  bodyGrad.addColorStop(1, '#b8431f');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(-13, 46);
  ctx.quadraticCurveTo(-16, 10, -11, -34);
  ctx.quadraticCurveTo(-8, -52, 0, -56);
  ctx.quadraticCurveTo(8, -52, 11, -34);
  ctx.quadraticCurveTo(16, 10, 13, 46);
  ctx.quadraticCurveTo(0, 52, -13, 46);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#7a3a22';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Cheatline stripe down the fuselage.
  ctx.fillStyle = '#2b6cb0';
  ctx.beginPath();
  ctx.moveTo(-12, 30);
  ctx.lineTo(12, 30);
  ctx.lineTo(11, 38);
  ctx.lineTo(-11, 38);
  ctx.closePath();
  ctx.fill();

  // Canopy glass.
  const glassGrad = ctx.createLinearGradient(0, -48, 0, -18);
  glassGrad.addColorStop(0, '#bfe3f2');
  glassGrad.addColorStop(1, '#2e5a74');
  ctx.fillStyle = glassGrad;
  ctx.beginPath();
  ctx.ellipse(0, -32, 8.5, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#23404f';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Tailplane and fin, near the camera at the bottom.
  ctx.fillStyle = '#d94f2b';
  ctx.beginPath();
  ctx.moveTo(-34, 40);
  ctx.lineTo(34, 40);
  ctx.lineTo(28, 50);
  ctx.lineTo(-28, 50);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#7a3a22';
  ctx.stroke();
  ctx.fillStyle = '#2b6cb0';
  ctx.beginPath();
  ctx.moveTo(-5, 34);
  ctx.lineTo(5, 34);
  ctx.lineTo(9, 52);
  ctx.lineTo(-9, 52);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#7a3a22';
  ctx.stroke();

  // Registration mark on the tail.
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SKY-7', 0, 44);

  // Prop spinner hint at the nose and exhaust puffs.
  ctx.fillStyle = '#33393f';
  ctx.beginPath();
  ctx.ellipse(0, -56, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(200, 200, 200, ${0.12 + prop * 0.1})`;
  ctx.beginPath();
  ctx.ellipse(0, -58, 10, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wingtip navigation lights.
  ctx.fillStyle = '#ff3b30';
  ctx.beginPath();
  ctx.arc(-116, 4, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#34c759';
  ctx.beginPath();
  ctx.arc(116, 4, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(0, 50, 2.5 + Math.sin(time * 6) * 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Landing gear legs and wheels when the gear is down.
  if (plane.gearDown) {
    ctx.strokeStyle = '#2e3438';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, 44);
    ctx.lineTo(-16, 62);
    ctx.moveTo(10, 44);
    ctx.lineTo(16, 62);
    ctx.stroke();
    ctx.fillStyle = '#1c1f22';
    ctx.beginPath();
    ctx.arc(-16, 64, 5, 0, Math.PI * 2);
    ctx.arc(16, 64, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5a636b';
    ctx.beginPath();
    ctx.arc(-16, 64, 2, 0, Math.PI * 2);
    ctx.arc(16, 64, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
