let video;
let handPose;
let hands = [];

const APP = {
  CONFIG: "config",
  EXERCISE: "exercise",
  END: "end"
};

const MODE = {
  BALL: "Apanhar a Bola",
  PATH: "Seguir o Caminho"
};

const DIFFICULTY = {
  FACIL: 0,
  MEDIO: 1,
  DIFICIL: 2
};

const DIFFICULTY_NAMES = ["Facil", "Medio", "Dificil"];

let estadoApp = APP.CONFIG;
let indiceModo = 0;
let nivelDificuldade = DIFFICULTY.MEDIO;

const layout = {
  totalW: 1160,
  totalH: 620,
  camW: 900,
  panelW: 260,
  panelX: 900
};

let startMillis = 0;
let elapsedSeconds = 0;

let pontuacaoBolas = 0;
let errosTrajeto = 0;
let precisaoMovimento = 100;
let pathProgress = 0;

let balls = [];
let ballCount = 3;

let pathPoints = [];
let pathTrail = [];
let maxTrail = 180;
let pathTolerance = 24;
let lastPathOnTrack = true;

let statusColor = "neutral";
let statusFlashFrames = 0;

let okHoldFrames = 0;
let holdAction = null;
let holdFrames = 0;

let speechRecognizer = null;
let speechReady = false;
let estadoReconhecimentoVoz = "Voz pronta";
let ultimoComandoVoz = "Nenhum";

function preload() {
  handPose = ml5.handPose();
}

function setup() {
  createCanvas(layout.totalW, layout.totalH);
  textFont("Trebuchet MS");

  video = createCapture(VIDEO);
  video.size(layout.camW, layout.totalH);
  video.hide();

  handPose.detectStart(video, gotHands);
  initSpeechRecognition();
  resetSession();
}

function draw() {
  drawBackground();
  drawMirroredVideo();

  const handInfos = obterDadosMaos();
  drawHandSkeletonOverlay();

  if (estadoApp === APP.CONFIG) {
    drawConfigScreen(handInfos);
  } else if (estadoApp === APP.EXERCISE) {
    elapsedSeconds = floor((millis() - startMillis) / 1000);
    runExercise(handInfos);
  } else {
    drawEndScreen(handInfos);
  }

  desenharPainelDireito(handInfos);
}

function drawBackground() {
  for (let y = 0; y < height; y += 2) {
    const t = map(y, 0, height, 0, 1);
    const c = lerpColor(color(10, 29, 48), color(18, 66, 82), t);
    stroke(c);
    line(0, y, width, y);
  }
}

function drawMirroredVideo() {
  push();
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.roundRect(20, 20, layout.camW - 40, height - 40, 22);
  drawingContext.clip();
  translate(layout.camW, 0);
  scale(-1, 1);
  image(video, 0, 0, layout.camW, height);
  drawingContext.restore();
  pop();

  noFill();
  stroke(255, 255, 255, 80);
  strokeWeight(2);
  rect(20, 20, layout.camW - 40, height - 40, 22);
}

function drawConfigScreen(handInfos) {
  const centerX = (layout.camW - 40) * 0.5 + 20;
  const centerY = height * 0.5;

  fill(0, 0, 0, 95);
  noStroke();
  rect(50, 55, layout.camW - 100, height - 110, 28);

  fill(235);
  textAlign(CENTER, TOP);
  textSize(34);
  text("Fisioterapia Digital", centerX, 90);

  textSize(20);
  text("Posicione a mao no centro da camara", centerX, 145);

  drawBodyGuide(centerX, centerY + 10);

  textSize(18);
  text("Modo: " + getCurrentMode(), centerX, 420);
  text("Dificuldade: " + DIFFICULTY_NAMES[nivelDificuldade], centerX, 452);
  text("Trocar modo: tecla M | Trocar dificuldade: teclas 1,2,3", centerX, 485);

  fill(47, 196, 124);
  rect(centerX - 110, 525, 220, 58, 14);
  fill(7, 44, 27);
  textSize(24);
  text("Iniciar", centerX, 542);

  fill(230);
  textSize(16);
  text(
    "Iniciar por gesto OK (segurar 1s) ou por voz: 'Iniciar'",
    centerX,
    590
  );

  textSize(14);
  fill(205);
  text("Voz: " + estadoReconhecimentoVoz + " | Ultimo comando: " + ultimoComandoVoz, centerX, 34);

  const okHand = handInfos.find((h) => h.isOK);
  if (okHand) {
    okHoldFrames++;
    const p = constrain(okHoldFrames / 30, 0, 1);
    drawProgressRing(okHand.indexX, okHand.indexY, p, color(66, 241, 158));
    if (okHoldFrames > 30) {
      startExercise();
    }
  } else {
    okHoldFrames = 0;
  }
}

function runExercise(handInfos) {
  if (getCurrentMode() === MODE.BALL) {
    runBallMode(handInfos);
  } else {
    runPathMode(handInfos);
  }

  if (statusFlashFrames > 0) {
    statusFlashFrames--;
  } else {
    statusColor = "neutral";
  }
}

function runBallMode(handInfos) {
  const speedMul = [0.85, 1.05, 1.25][nivelDificuldade];
  ballCount = [2, 3, 4][nivelDificuldade];
  ensureBallCount(ballCount);

  for (const b of balls) {
    b.x += b.vx * speedMul;
    b.y += b.vy * speedMul;

    if (b.x < 45 || b.x > layout.camW - 45) b.vx *= -1;
    if (b.y < 45 || b.y > height - 45) b.vy *= -1;

    const glow = statusColor === "good" ? color(87, 255, 170, 180) : color(35, 158, 255, 120);
    fill(glow);
    noStroke();
    circle(b.x, b.y, b.r * 2 + 12);

    fill(46, 168, 255);
    circle(b.x, b.y, b.r * 2);

    let caught = false;
    for (const handInfo of handInfos) {
      if (!handInfo.isGrabbing) continue;
      const d = dist(handInfo.palmX, handInfo.palmY, b.x, b.y);
      const catchRadius = b.r + max(40, handInfo.palmRadius * 0.75);
      if (d < catchRadius) {
        caught = true;
        break;
      }
    }

    if (caught) {
      pontuacaoBolas++;
      statusColor = "good";
      statusFlashFrames = 14;
      repositionBall(b);
    }
  }

  for (const handInfo of handInfos) {
    drawHandCursor(handInfo.palmX, handInfo.palmY, handInfo.isGrabbing);
  }

  fill(255);
  textAlign(LEFT, TOP);
  textSize(18);
  text("Feche a mao para apanhar a bola", 40, 30);
}

function runPathMode(handInfos) {
  if (pathPoints.length === 0) {
    generatePath();
  }

  noFill();
  const pathColor = statusColor === "bad" ? color(255, 91, 91) : color(116, 241, 255);
  stroke(pathColor);
  strokeWeight(4);
  beginShape();
  for (const p of pathPoints) {
    vertex(p.x, p.y);
  }
  endShape();

  const activeFinger = getBestFingerPoint(handInfos);
  if (activeFinger) {
    const finger = { x: activeFinger.x, y: activeFinger.y };
    const nearest = nearestPointDistance(finger, pathPoints);

    const onTrack = nearest < pathTolerance;
    if (onTrack) {
      statusColor = "good";
      pathProgress += 0.006;
    } else {
      statusColor = "bad";
      if (lastPathOnTrack) {
        errosTrajeto++;
      }
    }
    lastPathOnTrack = onTrack;
    statusFlashFrames = 2;

    pathTrail.push({ x: finger.x, y: finger.y, good: onTrack });
    if (pathTrail.length > maxTrail) pathTrail.shift();

    const totalSamples = max(pathTrail.length, 1);
    const goodSamples = pathTrail.filter((p) => p.good).length;
    precisaoMovimento = floor((goodSamples / totalSamples) * 100);

    if (pathProgress >= 1) {
      estadoApp = APP.END;
    }

    drawTrail();
    drawHandCursor(activeFinger.x, activeFinger.y, onTrack);
  } else {
    lastPathOnTrack = true;
  }

  drawPathTarget();

  fill(255);
  textAlign(LEFT, TOP);
  textSize(18);
  text("Use o dedo indicador para seguir o caminho", 40, 30);
}

function drawTrail() {
  if (pathTrail.length < 2) return;
  strokeWeight(3);
  for (let i = 1; i < pathTrail.length; i++) {
    const a = pathTrail[i - 1];
    const b = pathTrail[i];
    stroke(a.good ? color(40, 225, 127, 180) : color(255, 75, 75, 180));
    line(a.x, a.y, b.x, b.y);
  }
}

function drawPathTarget() {
  const x = 35 + (layout.camW - 90) * constrain(pathProgress, 0, 1);
  const y = height - 35;

  stroke(255, 255, 255, 90);
  strokeWeight(2);
  line(35, y, layout.camW - 55, y);

  noStroke();
  fill(255, 208, 69);
  circle(x, y, 15);
}

function drawEndScreen(handInfos) {
  fill(0, 0, 0, 120);
  noStroke();
  rect(60, 100, layout.camW - 120, height - 200, 24);

  fill(255);
  textAlign(CENTER, TOP);
  textSize(36);
  text("Sessao concluida", layout.camW * 0.5, 145);

  textSize(24);
  text("Bolas apanhadas: " + pontuacaoBolas, layout.camW * 0.5, 235);
  text("Erros de trajeto: " + errosTrajeto, layout.camW * 0.5, 275);
  text("Precisao media: " + precisaoMovimento + "%", layout.camW * 0.5, 315);

  fill(56, 203, 123);
  rect(layout.camW * 0.5 - 140, 410, 280, 62, 14);
  fill(7, 44, 27);
  textSize(24);
  text("Reiniciar", layout.camW * 0.5, 430);

  const restartBox = {
    x: layout.camW * 0.5 - 140,
    y: 410,
    w: 280,
    h: 62
  };

  const insideRestart = handInfos.some(
    (h) => h.isGrabbing && pointInRect(h.palmX, h.palmY, restartBox)
  );

  if (insideRestart) {
    holdFrames++;
    if (holdFrames > 30) {
      estadoApp = APP.CONFIG;
      holdFrames = 0;
    }
  } else {
    holdFrames = 0;
  }
}

function desenharPainelDireito(handInfos) {
  push();
  translate(layout.panelX, 0);

  const blockX = 14;
  const blockW = layout.panelW - blockX * 2;

  fill(5, 20, 34, 220);
  noStroke();
  rect(0, 0, layout.panelW, height);

  fill(255);
  textAlign(LEFT, TOP);
  textSize(22);
  text("Painel", 22, 18);

  drawPanelBlock(blockX, 60, blockW, 122, "Instrucoes", getCurrentInstruction());
  desenharBlocoControlos(handInfos, blockX, blockW);
  drawPanelBlock(
    blockX,
    350,
    blockW,
    122,
    "Info",
    "Tempo: " + elapsedSeconds + "s\nPrecisao: " + precisaoMovimento + "%\nNivel: " + DIFFICULTY_NAMES[nivelDificuldade]
  );
  drawPanelBlock(
    blockX,
    490,
    blockW,
    112,
    "Pontuacao",
    "Bolas: " + pontuacaoBolas + "\nErros trajeto: " + errosTrajeto
  );

  pop();
}

function drawPanelBlock(x, y, w, h, title, content) {
  fill(255, 255, 255, 30);
  noStroke();
  rect(x, y, w, h, 14);

  fill(239);
  textSize(16);
  textAlign(LEFT, TOP);
  text(title, x + 12, y + 10);

  fill(214);
  textSize(14);
  text(content, x + 12, y + 38);
}

function desenharBlocoControlos(handInfos, x, w) {
  const y = 200;
  const h = 132;

  fill(255, 255, 255, 30);
  noStroke();
  rect(x, y, w, h, 14);

  fill(239);
  textSize(16);
  textAlign(LEFT, TOP);
  text("Controlos", x + 12, y + 10);

  const sidePad = 10;
  const gap = 10;
  const btnW = (w - sidePad * 2 - gap) * 0.5;
  const btnH = 78;
  const restartBtn = { x: x + sidePad, y: y + 40, w: btnW, h: btnH, key: "restart" };
  const finishBtn = {
    x: x + sidePad + btnW + gap,
    y: y + 40,
    w: btnW,
    h: btnH,
    key: "finish"
  };

  drawButton(restartBtn, "Reiniciar", color(64, 184, 255));
  drawButton(finishBtn, "Terminar", color(255, 113, 98));

  if (estadoApp !== APP.EXERCISE || handInfos.length === 0) {
    holdAction = null;
    holdFrames = 0;
    return;
  }

  const activeHands = handInfos.filter((h) => h.isGrabbing || h.isOK);
  if (activeHands.length === 0) {
    holdAction = null;
    holdFrames = 0;
    return;
  }

  let hovered = null;
  for (const handInfo of activeHands) {
    // Hand detection happens only in the camera feed space (0..layout.camW).
    // Map those coordinates to the panel width so control buttons are reachable.
    const palmX = mapHandXToPanelLocal(handInfo.palmX, x, w);
    const indexX = mapHandXToPanelLocal(handInfo.indexX, x, w);

    if (
      pointInRect(palmX, handInfo.palmY, restartBtn) ||
      pointInRect(indexX, handInfo.indexY, restartBtn)
    ) {
      hovered = restartBtn.key;
      break;
    }
    if (
      pointInRect(palmX, handInfo.palmY, finishBtn) ||
      pointInRect(indexX, handInfo.indexY, finishBtn)
    ) {
      hovered = finishBtn.key;
      break;
    }
  }

  if (!hovered) {
    holdAction = null;
    holdFrames = 0;
    return;
  }

  if (hovered === holdAction) {
    holdFrames++;
  } else {
    holdAction = hovered;
    holdFrames = 1;
  }

  const progress = constrain(holdFrames / 24, 0, 1);
  fill(255, 255, 255, 200);
  rect(x + 12, y + 118, (w - 24) * progress, 8, 4);

  if (holdFrames > 24) {
    if (holdAction === "restart") {
      startExercise();
    } else if (holdAction === "finish") {
      estadoApp = APP.END;
    }
    holdAction = null;
    holdFrames = 0;
  }
}

function drawButton(btn, label, c) {
  fill(c);
  rect(btn.x, btn.y, btn.w, btn.h, 10);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(15);
  text(label, btn.x + btn.w * 0.5, btn.y + btn.h * 0.5);
}

function drawBodyGuide(cx, cy) {
  stroke(255, 255, 255, 180);
  strokeWeight(3);
  noFill();

  circle(cx, cy - 120, 70);
  line(cx, cy - 84, cx, cy + 40);
  line(cx - 80, cy - 34, cx + 80, cy - 34);
  line(cx, cy + 40, cx - 60, cy + 130);
  line(cx, cy + 40, cx + 60, cy + 130);

  fill(41, 210, 132, 130);
  noStroke();
  ellipse(cx, cy - 34, 200, 100);
}

function drawHandSkeletonOverlay() {
  if (!hands.length) return;

  const chains = [
    [0, 1, 2, 3, 4],
    [0, 5, 6, 7, 8],
    [0, 9, 10, 11, 12],
    [0, 13, 14, 15, 16],
    [0, 17, 18, 19, 20]
  ];

  const maxHandsToDraw = min(hands.length, 2);
  for (let h = 0; h < maxHandsToDraw; h++) {
    const hand = hands[h];
    if (!hand.keypoints || hand.keypoints.length < 21) continue;

    const kp = hand.keypoints;
    const mirror = (pt) => ({ x: layout.camW - pt.x, y: pt.y });

    stroke(255, 247, 196, 170);
    strokeWeight(3);
    for (const chain of chains) {
      for (let i = 0; i < chain.length - 1; i++) {
        const a = mirror(kp[chain[i]]);
        const b = mirror(kp[chain[i + 1]]);
        line(a.x, a.y, b.x, b.y);
      }
    }

    noStroke();
    for (let i = 0; i < kp.length; i++) {
      const pt = mirror(kp[i]);
      fill(i === 8 ? color(34, 235, 132) : color(255, 255, 255, 190));
      circle(pt.x, pt.y, i === 8 ? 9 : 6);
    }
  }
}

function drawHandCursor(x, y, good) {
  noFill();
  stroke(good ? color(34, 235, 132) : color(255, 107, 107));
  strokeWeight(3);
  circle(x, y, 26);

  noStroke();
  fill(good ? color(34, 235, 132, 180) : color(255, 107, 107, 180));
  circle(x, y, 10);
}

function drawProgressRing(x, y, p, c) {
  noFill();
  stroke(255, 255, 255, 90);
  strokeWeight(4);
  arc(x, y, 48, 48, -HALF_PI, TWO_PI - HALF_PI);

  stroke(c);
  strokeWeight(5);
  arc(x, y, 48, 48, -HALF_PI, -HALF_PI + TWO_PI * p);
}

function gotHands(results) {
  hands = (results || []).slice(0, 2);
}

function obterDadosMaos() {
  if (!hands.length) return [];

  const all = [];
  for (let h = 0; h < hands.length; h++) {
    const hand = hands[h];
    if (!hand.keypoints || hand.keypoints.length < 21) continue;

    const kp = hand.keypoints;
    const wrist = kp[0];
    const indexTip = kp[8];
    const middleTip = kp[12];
    const ringTip = kp[16];
    const pinkyTip = kp[20];
    const thumbTip = kp[4];
    const indexMcp = kp[5];

    const mirrored = (pt) => ({ x: layout.camW - pt.x, y: pt.y });
    const w = mirrored(wrist);
    const i = mirrored(indexTip);
    const m = mirrored(middleTip);
    const r = mirrored(ringTip);
    const p = mirrored(pinkyTip);
    const t = mirrored(thumbTip);
    const im = mirrored(indexMcp);

    const indexBase = mirrored(kp[5]);
    const middleBase = mirrored(kp[9]);
    const ringBase = mirrored(kp[13]);
    const pinkyBase = mirrored(kp[17]);

    const tipAvgToWrist =
      (dist(i.x, i.y, w.x, w.y) +
        dist(m.x, m.y, w.x, w.y) +
        dist(r.x, r.y, w.x, w.y) +
        dist(p.x, p.y, w.x, w.y)) /
      4;
    const baseAvgToWrist =
      (dist(indexBase.x, indexBase.y, w.x, w.y) +
        dist(middleBase.x, middleBase.y, w.x, w.y) +
        dist(ringBase.x, ringBase.y, w.x, w.y) +
        dist(pinkyBase.x, pinkyBase.y, w.x, w.y)) /
      4;

    const pinchDistance = dist(i.x, i.y, t.x, t.y);
    const closedHand = tipAvgToWrist < baseAvgToWrist * 1.75;
    const isPinching = pinchDistance < 42;
    const isGrabbing = closedHand || isPinching;

    const okPinch = pinchDistance < 28;
    const indexOpen = dist(i.x, i.y, w.x, w.y) > dist(im.x, im.y, w.x, w.y) + 25;
    const isOK = okPinch && indexOpen;

    const palmX = (w.x + i.x + m.x + r.x + p.x) / 5;
    const palmY = (w.y + i.y + m.y + r.y + p.y) / 5;
    const palmRadius = dist(w.x, w.y, m.x, m.y);

    all.push({
      valid: true,
      indexX: i.x,
      indexY: i.y,
      palmX,
      palmY,
      palmRadius,
      closedHand,
      isPinching,
      isGrabbing,
      isOK
    });
  }

  return all;
}

function getBestFingerPoint(handInfos) {
  if (!handInfos.length) return null;

  let best = handInfos[0];
  let bestDist = nearestPointDistance({ x: best.indexX, y: best.indexY }, pathPoints);

  for (let i = 1; i < handInfos.length; i++) {
    const candidate = handInfos[i];
    const d = nearestPointDistance({ x: candidate.indexX, y: candidate.indexY }, pathPoints);
    if (d < bestDist) {
      best = candidate;
      bestDist = d;
    }
  }

  return { x: best.indexX, y: best.indexY };
}

function repositionBall(ball) {
  ball.x = random(70, layout.camW - 70);
  ball.y = random(70, height - 70);
  ball.vx = random(-1.7, 1.7);
  ball.vy = random(-1.7, 1.7);
}

function ensureBallCount(target) {
  while (balls.length < target) {
    const b = { x: 0, y: 0, r: random(28, 38), vx: 0, vy: 0 };
    repositionBall(b);
    balls.push(b);
  }
  while (balls.length > target) balls.pop();
}

function generatePath() {
  pathPoints = [];
  const complexity = [5, 7, 9][nivelDificuldade];

  const anchors = [];
  for (let i = 0; i < complexity; i++) {
    const x = map(i, 0, complexity - 1, 65, layout.camW - 65);
    const y = random(120, height - 120);
    anchors.push({ x, y });
  }

  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    for (let t = 0; t <= 1; t += 0.08) {
      pathPoints.push({
        x: lerp(a.x, b.x, t),
        y: lerp(a.y, b.y, t)
      });
    }
  }

  pathTrail = [];
  lastPathOnTrack = true;
  pathProgress = 0;
  pathTolerance = [30, 24, 18][nivelDificuldade];
}

function nearestPointDistance(point, points) {
  let minDist = Infinity;
  for (const p of points) {
    const d = dist(point.x, point.y, p.x, p.y);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

function resetSession() {
  pontuacaoBolas = 0;
  errosTrajeto = 0;
  precisaoMovimento = 100;
  elapsedSeconds = 0;
  pathTrail = [];
  lastPathOnTrack = true;
  pathPoints = [];
  balls = [];
  ensureBallCount(ballCount);
}

function startExercise() {
  estadoApp = APP.EXERCISE;
  startMillis = millis();
  statusColor = "neutral";
  statusFlashFrames = 0;
  holdFrames = 0;
  holdAction = null;
  okHoldFrames = 0;
  resetSession();
  if (getCurrentMode() === MODE.PATH) {
    generatePath();
  }
}

function getCurrentMode() {
  return indiceModo === 0 ? MODE.BALL : MODE.PATH;
}

function getCurrentInstruction() {
  if (estadoApp === APP.CONFIG) {
    return "Ajuste modo e nivel\nAproxime-se da camara\nGesto OK para iniciar";
  }
  if (estadoApp === APP.END) {
    return "Sessao finalizada\nFeche a mao no botao\npara reiniciar";
  }
  if (getCurrentMode() === MODE.BALL) {
    return "Aproxime a palma da bola\nFeche a mao para agarrar\nMao aberta nao conta";
  }
  return "Use o indicador\nMantenha-se na linha guia\nEvite desvios";
}

function pointInRect(px, py, rectObj) {
  return (
    px >= rectObj.x &&
    px <= rectObj.x + rectObj.w &&
    py >= rectObj.y &&
    py <= rectObj.y + rectObj.h
  );
}

function keyPressed() {
  if (key === "m" || key === "M") {
    indiceModo = indiceModo === 0 ? 1 : 0;
  }
  if (key === "1") nivelDificuldade = DIFFICULTY.FACIL;
  if (key === "2") nivelDificuldade = DIFFICULTY.MEDIO;
  if (key === "3") nivelDificuldade = DIFFICULTY.DIFICIL;

  if (keyCode === ENTER && estadoApp === APP.CONFIG) {
    startExercise();
  }
}

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    estadoReconhecimentoVoz = "Nao suportado neste navegador";
    return;
  }

  speechRecognizer = new SpeechRecognition();
  speechRecognizer.lang = "pt-PT";
  speechRecognizer.continuous = true;
  speechRecognizer.interimResults = false;
  speechRecognizer.maxAlternatives = 3;

  speechRecognizer.onresult = (event) => {
    const altList = event.results[event.results.length - 1];
    const candidates = [];
    for (let i = 0; i < altList.length; i++) {
      candidates.push(normalizeSpeechText(altList[i].transcript || ""));
    }
    const merged = candidates.join(" ");

    if ((merged.includes("iniciar") || merged.includes("inicia") || merged.includes("comecar")) && estadoApp === APP.CONFIG) {
      ultimoComandoVoz = "Iniciar";
      startExercise();
    }
    if ((merged.includes("terminar") || merged.includes("parar") || merged.includes("acabar")) && estadoApp === APP.EXERCISE) {
      ultimoComandoVoz = "Terminar";
      estadoApp = APP.END;
    }

    estadoReconhecimentoVoz = "A escutar em Portugues (Portugal)";
  };

  speechRecognizer.onerror = (event) => {
    const erro = event.error || "desconhecido";

    // "no-speech" e comum quando ha silencio; nao deve desligar o reconhecimento.
    if (erro === "no-speech") {
      estadoReconhecimentoVoz = "A escutar (sem fala detetada)";
      return;
    }

    if (erro === "aborted") {
      estadoReconhecimentoVoz = "Reconhecimento reiniciado";
      return;
    }

    if (erro === "audio-capture") {
      speechReady = false;
      estadoReconhecimentoVoz = "Microfone nao detetado";
      return;
    }

    if (erro === "not-allowed" || erro === "service-not-allowed") {
      speechReady = false;
      estadoReconhecimentoVoz = "Permissao de microfone negada";
      return;
    }

    // Erros temporarios (ex.: network) tentam recuperar automaticamente no onend.
    estadoReconhecimentoVoz = "Erro de voz temporario: " + erro;
  };

  speechRecognizer.onstart = () => {
    estadoReconhecimentoVoz = "A escutar em Portugues (Portugal)";
  };

  speechRecognizer.onend = () => {
    if (speechReady) {
      try {
        setTimeout(() => {
          try {
            speechRecognizer.start();
          } catch (err) {
            speechReady = false;
            estadoReconhecimentoVoz = "Falha ao reiniciar voz";
          }
        }, 220);
      } catch (err) {
        speechReady = false;
        estadoReconhecimentoVoz = "Falha ao reiniciar voz";
      }
    }
  };

  try {
    speechReady = true;
    estadoReconhecimentoVoz = "A iniciar reconhecimento";
    speechRecognizer.start();
  } catch (err) {
    speechReady = false;
    estadoReconhecimentoVoz = "Sem permissao de microfone";
  }
}

function normalizeSpeechText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapHandXToPanelLocal(handX, panelStartX, panelWidth) {
  const camMinX = 20;
  const camMaxX = layout.camW - 20;
  return map(constrain(handX, camMinX, camMaxX), camMinX, camMaxX, panelStartX, panelStartX + panelWidth);
}