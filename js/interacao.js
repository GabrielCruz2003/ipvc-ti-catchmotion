// Callback do ml5: guarda ate 2 maos detetadas no frame atual.
function receberMaos(results) {
  if (!rastreioMaoPronto && typeof window.__loadingConcluido === "function") {
    window.__loadingConcluido();
  }
  rastreioMaoPronto = true;
  hands = (results || []).slice(0, 2);
}

// Converte keypoints em dados de alto nivel (palm, grab, gesto OK).
function obterInfoMaos() {
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

    const mirror = (pt) => ({ x: layout.camW - pt.x, y: pt.y });
    const w = mirror(wrist);
    const i = mirror(indexTip);
    const m = mirror(middleTip);
    const r = mirror(ringTip);
    const p = mirror(pinkyTip);
    const t = mirror(thumbTip);
    const im = mirror(indexMcp);

    const indexBase = mirror(kp[5]);
    const middleBase = mirror(kp[9]);
    const ringBase = mirror(kp[13]);
    const pinkyBase = mirror(kp[17]);

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
    const fistRatio = tipAvgToWrist / max(baseAvgToWrist, 1);
    const closedHand = fistRatio < 1.45;
    const isPinching = pinchDistance < 26;
    const isGrabbing = closedHand || isPinching;

    const fistStrength = constrain(map(1.55 - fistRatio, 0, 0.35, 0, 1), 0, 1);
    const pinchStrength = constrain(map(30 - pinchDistance, 0, 14, 0, 1), 0, 1);
    const grabStrength = max(fistStrength, pinchStrength);

    if (isGrabbing && grabStrength > 0.6) {
      handGrabStableFrames[h] = min(handGrabStableFrames[h] + 1, 12);
    } else {
      handGrabStableFrames[h] = 0;
    }

    const isGrabbingStrong = handGrabStableFrames[h] >= 4;

    const okPinch = pinchDistance < 34;
    const indexOpen = dist(i.x, i.y, w.x, w.y) > dist(im.x, im.y, w.x, w.y) + 14;
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
      isGrabbingStrong,
      grabStrength,
      isOK
    });
  }

  for (let i = all.length; i < handGrabStableFrames.length; i++) {
    handGrabStableFrames[i] = 0;
  }

  return all;
}

// Escolhe o indicador mais proximo do trajeto para controlo ativo.
function obterMelhorPontoDedo(handInfos) {
  if (!handInfos.length) return null;

  let best = handInfos[0];
  let bestDist = distanciaPontoMaisProximo({ x: best.indexX, y: best.indexY }, pontosTrajeto);

  for (let i = 1; i < handInfos.length; i++) {
    const candidate = handInfos[i];
    const d = distanciaPontoMaisProximo({ x: candidate.indexX, y: candidate.indexY }, pontosTrajeto);
    if (d < bestDist) {
      best = candidate;
      bestDist = d;
    }
  }

  return { x: best.indexX, y: best.indexY };
}

// Helper geometrico para hit-test de botoes e zonas interativas.
function pontoDentroRetangulo(px, py, rectObj) {
  return (
    px >= rectObj.x &&
    px <= rectObj.x + rectObj.w &&
    py >= rectObj.y &&
    py <= rectObj.y + rectObj.h
  );
}

// Ativa uma dica temporaria no overlay de assistencia.
function mostrarDica(mensagem, duracaoMs) {
  assistencia.tip = mensagem;
  assistencia.until = millis() + duracaoMs;
}

// Atualiza estado de movimento da palma para detetar inatividade.
function updateAssistanceMovement(handInfos) {
  if (!handInfos.length) return;

  const palm = { x: handInfos[0].palmX, y: handInfos[0].palmY };
  if (!assistencia.lastPalm) {
    assistencia.lastPalm = palm;
    assistencia.lastMoveMs = millis();
    return;
  }

  const motion = dist(palm.x, palm.y, assistencia.lastPalm.x, assistencia.lastPalm.y);
  if (motion > 3.2) {
    assistencia.lastMoveMs = millis();
  }

  assistencia.lastPalm = palm;
}

// Mostra dica quando ha pouca atividade durante o exercicio.
function detetarInatividadeDica(handInfos) {
  if (estadoApp !== ESTADO_APP.EXERCISE) return;
  if (!handInfos.length) {
    if (millis() > assistencia.until) mostrarDica("Aproxime a mao da camara para continuar.", 1800);
    return;
  }

  const msInatividade = millis() - assistencia.lastMoveMs;
  if (msInatividade > PERFIL_DIFICULDADE[nivelDificuldade].msInatividade && millis() > assistencia.until) {
    mostrarDica("Movimente a mao para manter o exercicio ativo.", 1700);
    assistencia.lastMoveMs = millis();
  }
}

// Mostra ajuda contextual no modo de captura de bolas.
function detetarNecessidadeAssistenciaBolas() {
  const dryMs = millis() - assistencia.lastGoodActionMs;
  const limite = PERFIL_DIFICULDADE[nivelDificuldade].msSemCapturaDica;
  if (dryMs > limite && millis() > assistencia.until) {
    mostrarDica("Dica: aproxime a palma da bola e feche a mao para capturar.", 1900);
    assistencia.lastGoodActionMs = millis();
  }
}

// Mostra ajuda contextual no modo de seguir trajeto.
function detetarNecessidadeAssistenciaTrajeto() {
  const perfil = PERFIL_DIFICULDADE[nivelDificuldade];

  if (
    errosTrajeto - assistencia.ultimoContadorErrosTrajeto >= perfil.limiteDicaErroTrajeto &&
    millis() > assistencia.until
  ) {
    mostrarDica("Dica: reduza a velocidade e mantenha o indicador perto da linha.", 2000);
    assistencia.ultimoContadorErrosTrajeto = errosTrajeto;
  }

  if (precisaoMovimento < 55 && millis() > assistencia.until) {
    mostrarDica("Precisao baixa: tente movimentos curtos e mais controlados.", 1800);
  }
}

// Atalhos de teclado para modo, dificuldade e inicio rapido.
function keyPressed() {
  garantirVozAtiva();

  if (key === "m" || key === "M") {
    indiceModo = indiceModo === 0 ? 1 : 0;
  }

  if (key === "1") definirDificuldade(DIFICULDADE.FACIL);
  if (key === "2") definirDificuldade(DIFICULDADE.MEDIO);
  if (key === "3") definirDificuldade(DIFICULDADE.DIFICIL);

  if (keyCode === ENTER && estadoApp === ESTADO_APP.CONFIG) {
    iniciarExercicio();
  }
}

// Clique de rato para iniciar, controlar painel e escolher dificuldade.
function mousePressed() {
  garantirVozAtiva();

  if (estadoApp === ESTADO_APP.CONFIG && pontoDentroRetangulo(mouseX, mouseY, botaoIniciar)) {
    iniciarExercicio();
    return;
  }

  if (estadoApp === ESTADO_APP.EXERCISE) {
    const geoCamara =
      typeof obterGeometriaControlosCamara === "function"
        ? obterGeometriaControlosCamara()
        : { restartBtn: null, finishBtn: null };
    const restartCamara = botoesCamara.restart || geoCamara.restartBtn;
    const finishCamara = botoesCamara.finish || geoCamara.finishBtn;

    if (restartCamara && pontoDentroRetangulo(mouseX, mouseY, restartCamara)) {
      iniciarExercicio();
      return;
    }
    if (finishCamara && pontoDentroRetangulo(mouseX, mouseY, finishCamara)) {
      estadoApp = ESTADO_APP.END;
      return;
    }

    if (botoesPainel.restart && pontoDentroRetangulo(mouseX, mouseY, botoesPainel.restart)) {
      iniciarExercicio();
      return;
    }
    if (botoesPainel.finish && pontoDentroRetangulo(mouseX, mouseY, botoesPainel.finish)) {
      estadoApp = ESTADO_APP.END;
      return;
    }
  }

  if (estadoApp !== ESTADO_APP.EXERCISE && botoesDificuldade.length) {
    const clicked = botoesDificuldade.find((btn) => pontoDentroRetangulo(mouseX, mouseY, btn));
    if (clicked) {
      definirDificuldade(clicked.level);
      return;
    }
  }

  if (estadoApp === ESTADO_APP.END && botoesDificuldadeFim.length) {
    const restartFimBox = {
      x: layout.camW * 0.5 - 165,
      y: 390,
      w: 330,
      h: 72
    };
    if (pontoDentroRetangulo(mouseX, mouseY, restartFimBox)) {
      estadoApp = ESTADO_APP.CONFIG;
      reiniciarSessao();
      return;
    }

    const clickedEnd = botoesDificuldadeFim.find((btn) => pontoDentroRetangulo(mouseX, mouseY, btn));
    if (clickedEnd) {
      definirDificuldade(clickedEnd.level);
      return;
    }
  }
}

// Altera dificuldade e recalcula o tempo total da sessao.
function definirDificuldade(level) {
  nivelDificuldade = constrain(level, DIFICULDADE.FACIL, DIFICULDADE.DIFICIL);
  segundosTotaisExercicio = DURACAO_EXERCICIO_POR_DIFICULDADE[nivelDificuldade];
  segundosRestantes = segundosTotaisExercicio;
}

// Inicializa e gere comandos de voz em Portugues (Portugal).
function iniciarReconhecimentoVoz() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    estadoVoz = "Nao suportado neste navegador";
    return;
  }

  reconhecedorVoz = new SpeechRecognition();
  reconhecedorVoz.lang = "pt-PT";
  reconhecedorVoz.continuous = true;
  reconhecedorVoz.interimResults = false;
  reconhecedorVoz.maxAlternatives = 3;

  reconhecedorVoz.onresult = (event) => {
    const altList = event.results[event.results.length - 1];
    const candidates = [];
    for (let i = 0; i < altList.length; i++) {
      candidates.push(normalizarTextoVoz(altList[i].transcript || ""));
    }

    const merged = candidates.join(" ");

    processarComandoVoz(merged);
  };

  reconhecedorVoz.onerror = (event) => {
    const error = event.error || "desconhecido";

    if (error === "no-speech") {
      estadoVoz = "A escutar (sem fala detetada)";
      return;
    }

    if (error === "aborted") {
      estadoVoz = "Reconhecimento reiniciado";
      return;
    }

    if (error === "audio-capture") {
      vozPronta = false;
      estadoVoz = "Microfone nao detetado";
      return;
    }

    if (error === "not-allowed" || error === "service-not-allowed") {
      vozPronta = false;
      estadoVoz = "Permissao de microfone negada";
      return;
    }

    estadoVoz = "Erro de voz temporario: " + error;
  };

  reconhecedorVoz.onstart = () => {
    vozPronta = true;
    estadoVoz = "A escutar em Portugues (Portugal)";
  };

  reconhecedorVoz.onend = () => {
    if (!vozPronta || !reconhecedorVoz) return;

    setTimeout(() => {
      try {
        reconhecedorVoz.start();
      } catch (error) {
        // Evita desligar de vez em erros transitórios (ex.: invalid state).
        estadoVoz = "A escutar em Portugues (Portugal)";
      }
    }, 220);
  };

  vozPronta = true;
  estadoVoz = "A iniciar reconhecimento";
  tentarIniciarReconhecedorVoz();
}

function contemAlgumComando(texto, lista) {
  return lista.some((cmd) => texto.includes(cmd));
}

function processarComandoVoz(textoNormalizado) {
  const comandoIniciar = contemAlgumComando(textoNormalizado, ["iniciar", "inicia", "comecar", "comecar"]);
  const comandoTerminar = contemAlgumComando(textoNormalizado, ["terminar", "parar", "acabar", "finalizar"]);
  const comandoReiniciar = contemAlgumComando(textoNormalizado, ["reiniciar", "recomecar", "recomecar"]);

  if (comandoReiniciar) {
    ultimoComandoVoz = "Reiniciar";

    if (estadoApp === ESTADO_APP.EXERCISE) {
      iniciarExercicio();
    } else {
      estadoApp = ESTADO_APP.CONFIG;
      reiniciarSessao();
    }

    estadoVoz = "Comando: reiniciar";
    return;
  }

  if (comandoTerminar) {
    ultimoComandoVoz = "Terminar";
    if (estadoApp === ESTADO_APP.EXERCISE) {
      estadoApp = ESTADO_APP.END;
      estadoVoz = "Comando: terminar";
    } else {
      estadoVoz = "Comando de terminar disponivel durante o exercicio";
    }
    return;
  }

  if (comandoIniciar) {
    ultimoComandoVoz = "Iniciar";

    if (estadoApp !== ESTADO_APP.EXERCISE) {
      iniciarExercicio();
      estadoVoz = "Comando: iniciar";
    } else {
      estadoVoz = "Exercicio ja iniciado";
    }
    return;
  }

  estadoVoz = "A escutar em Portugues (Portugal)";
}

function tentarIniciarReconhecedorVoz() {
  if (!reconhecedorVoz || !vozPronta) return;

  try {
    reconhecedorVoz.start();
  } catch (error) {
    const nomeErro = error && error.name ? error.name : "";

    if (nomeErro === "InvalidStateError") {
      return;
    }

    vozPronta = false;
    estadoVoz = "Sem permissao de microfone";
  }
}

function garantirVozAtiva() {
  if (!reconhecedorVoz) return;
  if (!vozPronta) {
    vozPronta = true;
  }
  tentarIniciarReconhecedorVoz();
}

// Normaliza texto reconhecido para comparacoes robustas.
function normalizarTextoVoz(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Mapeia coordenada X da camara para o sistema local do painel.
function mapearXMaoParaPainelLocal(handX, panelStartX, panelWidth) {
  const camMinX = layout.framePad;
  const camMaxX = layout.camW - layout.framePad;
  return map(
    constrain(handX, camMinX, camMaxX),
    camMinX,
    camMaxX,
    panelStartX,
    panelStartX + panelWidth
  );
}
