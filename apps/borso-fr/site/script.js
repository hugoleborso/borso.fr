const navIcon = document.getElementById('nav-icon');
const navMenu = document.getElementById('nav-menu');

navIcon.addEventListener('click', function() {
  navIcon.classList.toggle('open');
  navMenu.classList.toggle('open');
});

const canvas = document.getElementById('gradient-canvas');
const ctx = canvas.getContext('2d');
let w, h;

const POINTS_COUNT = 6;

let points = [];

const colors = [
  '#ff0057',
  '#1c92d2',
  '#ff7f50',
  '#6a0dad',
  '#fffd82',
  '#03fcba',
  '#f441a5',
];

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function initPoints() {
  points = [];
  for (let i = 0; i < POINTS_COUNT; i++) {
    points.push({
      x: random(0, w),
      y: random(0, h),
      vx: random(0, 1) > 0.5 ? random(0.3, 0.7) : random(-0.7, -0.3),
      vy: random(0, 1) > 0.5 ? random(0.3, 0.7) : random(-0.7, -0.3),
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
}

function resize() {
  w = window.innerWidth;
  h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;
  initPoints();
}

window.addEventListener('resize', resize);
resize();

function animate() {
  // Clear canvas
  ctx.clearRect(0, 0, w, h);

  // Draw each point as a radial gradient
  ctx.globalCompositeOperation = 'screen';

  for (let i = 0; i < points.length; i++) {
    const p = points[i];

    // Create radial gradient
    const gradient = ctx.createRadialGradient(
      p.x,
      p.y,
      0,
      p.x,
      p.y,
      Math.min(w, h) * 0.6 // radius
    );
    gradient.addColorStop(0, p.color);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(p.x - (w * 0.6), p.y - (h * 0.6), w * 1.2, h * 1.2);

    // Move the points
    p.x += p.vx;
    p.y += p.vy;

    // Bounce off edges
    if (p.x < 0 || p.x > w) p.vx *= -1;
    if (p.y < 0 || p.y > h) p.vy *= -1;
  }

  ctx.globalCompositeOperation = 'source-over';

  requestAnimationFrame(animate);
}

animate();