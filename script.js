const video = document.getElementById('video');
const canvas = document.getElementById('output');
const ctx = canvas.getContext('2d');
const hud = document.getElementById('hud');

let fruits = [];
let score = 0;
let detector = null;

const maxFruits = 10;
let fruitsSpawned = 0;
let spawnIntervalId = null;
let gameOver = false;

const connections = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [15, 17],
  [16, 18],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [27, 29],
  [28, 30],
];

function spawnFruit() {
  if (fruitsSpawned >= maxFruits) {
    endGame();
    return;
  }
  fruitsSpawned++;
  const typesFruits = ['🍉', '🍎', '🍓', '🍊', '🍍', '🍇', '🍒'];
  const type = typesFruits[Math.floor(Math.random() * typesFruits.length)];
  fruits.push({
    x: Math.random() * canvas.width,
    y: -30,
    radius: 20,
    velocityY: 3 + Math.random() * 2,
    type,
    cut: false,
  });
}

function detectCuts(hands) {
  for (let fruit of fruits) {
    if (fruit.cut) continue;
    for (let hand of hands) {
      const dx = fruit.x - hand.x,
        dy = fruit.y - hand.y;
      if (Math.hypot(dx, dy) < fruit.radius + 20) {
        fruit.cut = true;
        score++;
        hud.textContent = `Puntaje: ${score}`;
        break;
      }
    }
  }
}

function drawFruits() {
  ctx.font = '30px Arial';
  for (let fruit of fruits) {
    if (!fruit.cut) ctx.fillText(fruit.type, fruit.x, fruit.y);
  }
}

function updateFruits() {
  fruits.forEach((f) => {
    if (!f.cut) f.y += f.velocityY;
  });
  fruits = fruits.filter((f) => f.y < canvas.height && !f.cut);
}

async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480 },
    audio: false,
  });
  video.srcObject = stream;
  return new Promise((res) => (video.onloadedmetadata = () => res(video)));
}

async function initGame() {
  await tf.setBackend('webgl');
  await setupCamera();
  video.play();

  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.BlazePose,
    { runtime: 'tfjs', modelType: 'full', enableSmoothing: true },
  );

  spawnIntervalId = setInterval(spawnFruit, 2000);
  requestAnimationFrame(detectPose);
}

function endGame() {
  gameOver = true;
  clearInterval(spawnIntervalId);

  hud.textContent = `Juego terminado - Puntaje final: ${score}`;
}

async function detectPose() {
  if (gameOver) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    requestAnimationFrame(detectPose);
    return;
  }

  const poses = await detector.estimatePoses(video, { flipHorizontal: true });

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  let hands = [];
  if (poses.length > 0) {
    const key = poses[0].keypoints;
    const leftWrist = key[15],
      rightWrist = key[16];
    if (leftWrist?.score > 0.5) hands.push(leftWrist);
    if (rightWrist?.score > 0.5) hands.push(rightWrist);

    ctx.strokeStyle = 'lime';
    ctx.lineWidth = 2;
    connections.forEach(([i, j]) => {
      const a = key[i];
      const b = key[j];
      if (a?.score > 0.5 && b?.score > 0.5) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    });
    key.forEach((point) => {
      if (point.score > 0.5) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();
      }
    });
  }

  updateFruits();
  detectCuts(hands);
  drawFruits();

  requestAnimationFrame(detectPose);
}

window.onload = () => initGame();