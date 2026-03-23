// Executa o modo ativo e atualiza assistência/feedback visual.
function executarExercicio(handInfos) {
  if (obterModoAtual() === MODO.BOLAS) {
    executarModoBolas(handInfos);
    detetarNecessidadeAssistenciaBolas();
  } else {
    executarModoTrajeto(handInfos);
    detetarNecessidadeAssistenciaTrajeto();
  }

  if (framesFlashEstado > 0) {
    framesFlashEstado--;
  } else {
    tomEstado = "neutral";
  }

  detetarInatividadeDica(handInfos);
}

// Atualiza física das bolas, captura por mão e pontuação.
function executarModoBolas(handInfos) {
  const perfil = PERFIL_DIFICULDADE[nivelDificuldade];
  garantirQuantidadeBolas(perfil.quantidadeBolas);

  for (const bola of bolas) {
    if (bola.captureFrames > 0) {
      bola.captureFrames--;

      const progress = 1 - bola.captureFrames / bola.captureDuration;
      const scale = max(1 - progress, 0);
      const drawR = bola.r * scale;

      if (drawR > 0.5) {
        fill(35, 158, 255, 108);
        noStroke();
        circle(bola.x, bola.y, drawR * 2 + 10 * scale);

        fill(38, 174, 255);
        circle(bola.x, bola.y, drawR * 2);
      }

      if (bola.captureFrames <= 0) {
        reposicionarBola(bola);
      }
      continue;
    }

    bola.x += bola.vx * perfil.velocidadeBolasMul;
    bola.y += bola.vy * perfil.velocidadeBolasMul;

    if (bola.x < 45 || bola.x > layout.camW - 45) bola.vx *= -1;
    if (bola.y < 45 || bola.y > height - 45) bola.vy *= -1;

    fill(35, 158, 255, 124);
    noStroke();
    circle(bola.x, bola.y, bola.r * 2 + 12);

    fill(38, 174, 255);
    circle(bola.x, bola.y, bola.r * 2);

    let caught = false;
    for (const handInfo of handInfos) {
      if (!handInfo.isGrabbingStrong) continue;
      const d = dist(handInfo.palmX, handInfo.palmY, bola.x, bola.y);
      const catchRadius = bola.r + max(40, handInfo.palmRadius * 0.75);
      if (d < catchRadius) {
        caught = true;
        break;
      }
    }

    if (caught) {
      pontuacaoBolas++;
      tomEstado = "good";
      framesFlashEstado = 14;
      assistencia.lastGoodActionMs = millis();
      bola.captureFrames = bola.captureDuration;
    }
  }

  for (const handInfo of handInfos) {
    desenharCursorMao(handInfo.palmX, handInfo.palmY, handInfo.isGrabbing);
  }

  fill(255);
  textAlign(LEFT, TOP);
  textSize(18);
  text("Feche a mão para apanhar as bolas", 40, 30);
}

// Avalia o seguimento do trajeto com dedo indicador e calcula precisão.
function executarModoTrajeto(handInfos) {
  if (pontosTrajeto.length === 0) {
    gerarTrajeto();
  }

  noFill();
  stroke(tomEstado === "bad" ? color(255, 94, 94) : color(114, 241, 255));
  strokeWeight(4);
  beginShape();
  for (const point of pontosTrajeto) {
    vertex(point.x, point.y);
  }
  endShape();

  const activeFinger = obterMelhorPontoDedo(handInfos);
  if (activeFinger) {
    const finger = { x: activeFinger.x, y: activeFinger.y };
    const nearest = distanciaPontoMaisProximo(finger, pontosTrajeto);
    const toleranciaTrajeto = PERFIL_DIFICULDADE[nivelDificuldade].toleranciaTrajeto;
    const onTrack = nearest < toleranciaTrajeto;

    if (onTrack) {
      tomEstado = "good";
      progressoTrajeto += 0.0062;
      assistencia.lastGoodActionMs = millis();
    } else {
      tomEstado = "bad";
      if (trajetoEstavaNaLinha) {
        errosTrajeto++;
      }
    }

    trajetoEstavaNaLinha = onTrack;
    framesFlashEstado = 2;

    rastoTrajeto.push({ x: finger.x, y: finger.y, good: onTrack });
    if (rastoTrajeto.length > maxRasto) rastoTrajeto.shift();

    const total = max(rastoTrajeto.length, 1);
    const good = rastoTrajeto.filter((sample) => sample.good).length;
    precisaoMovimento = floor((good / total) * 100);

    if (progressoTrajeto >= 1) {
      estadoApp = ESTADO_APP.END;
    }

    desenharRasto();
    desenharCursorMao(activeFinger.x, activeFinger.y, onTrack);
  } else {
    trajetoEstavaNaLinha = true;
  }

  desenharAlvoTrajeto();

  fill(255);
  textAlign(LEFT, TOP);
  textSize(18);
  text("Siga o caminho com o dedo indicador", 40, 30);
}

// Posiciona e relança uma bola com nova velocidade aleatória.
function reposicionarBola(ball) {
  ball.x = random(70, layout.camW - 70);
  ball.y = random(70, height - 70);
  ball.vx = random(-1.7, 1.7);
  ball.vy = random(-1.7, 1.7);
  ball.captureFrames = 0;
}

// Garante o número de bolas esperado para a dificuldade atual.
function garantirQuantidadeBolas(target) {
  while (bolas.length < target) {
    const ball = {
      x: 0,
      y: 0,
      r: random(28, 38),
      vx: 0,
      vy: 0,
      captureDuration: 8,
      captureFrames: 0
    };
    reposicionarBola(ball);
    bolas.push(ball);
  }
  while (bolas.length > target) bolas.pop();
}

// Gera um caminho segmentado entre âncoras aleatórias.
function gerarTrajeto() {
  pontosTrajeto = [];

  const profile = PERFIL_DIFICULDADE[nivelDificuldade];
  const anchors = [];
  for (let i = 0; i < profile.ancorasTrajeto; i++) {
    const x = map(i, 0, profile.ancorasTrajeto - 1, 65, layout.camW - 65);
    const y = random(120, height - 120);
    anchors.push({ x, y });
  }

  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    for (let t = 0; t <= 1; t += 0.08) {
      pontosTrajeto.push({
        x: lerp(a.x, b.x, t),
        y: lerp(a.y, b.y, t)
      });
    }
  }

  rastoTrajeto = [];
  trajetoEstavaNaLinha = true;
  progressoTrajeto = 0;
}

// Distância mínima de um ponto a uma lista de pontos.
function distanciaPontoMaisProximo(point, points) {
  let minDist = Infinity;
  for (const p of points) {
    const d = dist(point.x, point.y, p.x, p.y);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

// Repõe pontuações, coleções e timers para começar limpo.
function reiniciarSessao() {
  pontuacaoBolas = 0;
  errosTrajeto = 0;
  precisaoMovimento = 100;
  segundosDecorridos = 0;

  rastoTrajeto = [];
  trajetoEstavaNaLinha = true;
  progressoTrajeto = 0;
  pontosTrajeto = [];

  bolas = [];
  garantirQuantidadeBolas(PERFIL_DIFICULDADE[nivelDificuldade].quantidadeBolas);
  handGrabStableFrames = [0, 0];

  tomEstado = "neutral";
  framesFlashEstado = 0;
  segundosTotaisExercicio = DURACAO_EXERCICIO_POR_DIFICULDADE[nivelDificuldade];
  segundosRestantes = segundosTotaisExercicio;

  assistencia.tip = "";
  assistencia.until = 0;
  assistencia.lastGoodActionMs = millis();
  assistencia.lastMoveMs = millis();
  assistencia.ultimoContadorErrosTrajeto = 0;
  assistencia.lastPalm = null;
}

function iniciarContagemExercicio() {
  framesSegurarOK = 0;
  framesSegurarCentro = 0;
  framesSegurarBotaoMao = 0;
  acaoSegurarPainel = null;
  acaoSegurarCamara = null;
  acaoSegurarDificuldadeFim = null;
  framesSegurarPainel = 0;
  framesSegurarCamara = 0;
  framesSegurarDificuldadeFim = 0;
  cooldownControloPainelAte = millis() + 500;
  cooldownControloCamaraAte = millis() + 500;
  controloPainelPrecisaLargar = true;
  controloCamaraPrecisaLargar = true;
  framesSegurarReiniciarFim = 0;

  segundosTotaisExercicio = DURACAO_EXERCICIO_POR_DIFICULDADE[nivelDificuldade];
  segundosRestantes = segundosTotaisExercicio;
  reiniciarSessao();

  if (obterModoAtual() === MODO.TRAJETO) {
    gerarTrajeto();
  }

  estadoApp = ESTADO_APP.COUNTDOWN;
  contagemAtual = CONTAGEM_INICIAL_SEGUNDOS;
  contagemInicioMillis = millis();
  tocarSomContagem(contagemAtual);
}

function atualizarContagemExercicio() {
  if (estadoApp !== ESTADO_APP.COUNTDOWN) return;

  const elapsedMs = millis() - contagemInicioMillis;
  const novoValor = CONTAGEM_INICIAL_SEGUNDOS - floor(elapsedMs / 1000);

  if (novoValor < contagemAtual && novoValor > 0) {
    contagemAtual = novoValor;
    tocarSomContagem(contagemAtual);
  }

  if (elapsedMs >= CONTAGEM_INICIAL_SEGUNDOS * 1000) {
    iniciarExercicioAgora();
  }
}

function iniciarExercicioAgora() {
  estadoApp = ESTADO_APP.EXERCISE;
  inicioMillis = millis();
  contagemAtual = 0;
  tocarSomInicioJogo();
}

function tocarSomContagem(valor) {
  try {
    userStartAudio();
  } catch (error) {
    // Mantem a contagem a funcionar mesmo sem permissao de audio.
  }

  if (!osciladorContagem) {
    osciladorContagem = new p5.Oscillator("triangle");
    osciladorContagem.start();
    osciladorContagem.amp(0);
  }

  let freq = 620;
  if (valor === 2) freq = 760;
  if (valor === 1) freq = 920;

  osciladorContagem.freq(freq);
  osciladorContagem.amp(0.24, 0.01);
  osciladorContagem.amp(0, 0.14);
}

function tocarSomInicioJogo() {
  try {
    userStartAudio();
  } catch (error) {
    // Mantem inicio do jogo mesmo sem audio.
  }

  if (!osciladorInicio) {
    osciladorInicio = new p5.Oscillator("sine");
    osciladorInicio.start();
    osciladorInicio.amp(0);
  }

  // Jingle curto de arranque: subida rapida + confirmação final.
  osciladorInicio.freq(620);
  osciladorInicio.amp(0.12, 0.02);
  osciladorInicio.freq(980, 0.12);
  osciladorInicio.amp(0, 0.15);

  setTimeout(() => {
    if (!osciladorInicio) return;
    osciladorInicio.freq(1240);
    osciladorInicio.amp(0.16, 0.015);
    osciladorInicio.amp(0, 0.2);
  }, 120);
}

// Entra no estado de exercício e inicializa a nova ronda.
function iniciarExercicio() {
  iniciarContagemExercicio();
}

// Retorna o modo selecionado no seletor.
function obterModoAtual() {
  return indiceModo === 0 ? MODO.BOLAS : MODO.TRAJETO;
}

// Texto orientador exibido no painel para cada estado/modo.
function obterInstrucaoAtual() {
  if (estadoApp === ESTADO_APP.CONFIG) {
    return "Escolha modo e nível\nClique em Iniciar ou use gesto\nMão no centro também inicia";
  }
  if (estadoApp === ESTADO_APP.COUNTDOWN) {
    return "A preparar sessão\nContagem decrescente em curso\nMantenha-se pronto para começar";
  }
  if (estadoApp === ESTADO_APP.END) {
    return "Sessão concluída\nFeche a mão em Reiniciar\nou use voz: reiniciar";
  }
  if (obterModoAtual() === MODO.BOLAS) {
    return "Aproxime a palma da bola\nFeche a mão para agarrar\nCada captura soma 1 ponto";
  }
  return "Use o dedo indicador\nMantenha-se na linha guia\nEvite desvios para maior precisão";
}
