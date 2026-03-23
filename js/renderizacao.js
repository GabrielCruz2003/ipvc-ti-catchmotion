// Fundo dinamico com gradiente vertical e grelha subtil.
function desenharFundo() {
  for (let y = 0; y < height; y += 2) {
    const t = map(y, 0, height, 0, 1);
    const c = lerpColor(color(7, 30, 54), color(8, 74, 90), t);
    stroke(c);
    line(0, y, width, y);
  }

  noFill();
  stroke(255, 255, 255, 22);
  strokeWeight(1);
  for (let x = 40; x < layout.camW - 40; x += 60) {
    line(x, 0, x, height);
  }
}

// Mostra feed da camara espelhado e recortado com cantos arredondados.
function desenharVideoEspelhado() {
  push();
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.roundRect(
    layout.framePad,
    layout.framePad,
    layout.camW - layout.framePad * 2,
    height - layout.framePad * 2,
    22
  );
  drawingContext.clip();
  translate(layout.camW, 0);
  scale(-1, 1);
  image(video, 0, 0, layout.camW, height);
  drawingContext.restore();
  pop();

  noFill();
  stroke(255, 255, 255, 90);
  strokeWeight(2);
  rect(
    layout.framePad,
    layout.framePad,
    layout.camW - layout.framePad * 2,
    height - layout.framePad * 2,
    22
  );
}

// Ecra inicial com instrucoes, botao e ativacao por gesto.
function desenharEcraConfiguracao(handInfos) {
  const centerX = layout.camW * 0.5;
  const centerY = height * 0.5;
  const yInicio = 442;
  const yDificuldade = yInicio - 70;

  fill(5, 15, 24, 148);
  noStroke();
  rect(50, 55, layout.camW - 100, height - 110, 28);

  fill(255, 255, 255, 16);
  rect(66, 71, layout.camW - 132, 64, 16);

  fill(238, 249, 255);
  textAlign(CENTER, TOP);
  textSize(44);
  text("CatchMotion", centerX, 88);

  textSize(19);
  fill(198, 225, 242);
  text("Sistema de Fisioterapia e Reabilitacao", centerX, 145);

  desenharGuiaCorpo(centerX, centerY + 6);

  botaoIniciar.x = centerX - botaoIniciar.w * 0.5;
  botaoIniciar.y = yInicio;

  const ratoSobreIniciar = pontoDentroRetangulo(mouseX, mouseY, botaoIniciar);
  fill(ratoSobreIniciar ? color(76, 233, 174) : color(52, 202, 146));
  rect(botaoIniciar.x, botaoIniciar.y, botaoIniciar.w, botaoIniciar.h, 14);
  fill(5, 44, 30);
  textSize(27);
  text("Iniciar", centerX, yInicio + 20);

  desenharSeletorDificuldadeInicio(handInfos, centerX, yDificuldade);

  fill(217, 234, 244);
  textSize(15);
  text("Clique em Iniciar, aponte para o botao, gesto OK, mao no centro ou voz", centerX, 518);

  fill(241, 214, 120);
  textSize(14);
  text("Escolha dificuldade aqui ou no painel lateral", centerX, 542);

  const hasHands = handInfos.length > 0;
  const handInCenter = handInfos.find((h) => {
    const nearCenter = dist(h.palmX, h.palmY, centerX, centerY - 25) < 130;
    const openHand = !h.isGrabbing;
    return nearCenter && openHand;
  });
  const okHand = handInfos.find((h) => h.isOK || (h.isPinching && !h.isGrabbingStrong));
  const handOnStartButton = handInfos.find((h) => {
    const dedoNoBotao = pontoDentroRetangulo(h.indexX, h.indexY, botaoIniciar);
    const palmaNoBotao = pontoDentroRetangulo(h.palmX, h.palmY, botaoIniciar);
    return (dedoNoBotao || palmaNoBotao) && !h.isGrabbingStrong;
  });

  if (!rastreioMaoPronto) {
    fill(250, 222, 128);
    textSize(15);
    text("A iniciar deteccao de maos... aguarde 1-2 segundos", centerX, 558);
  }

  if (!hasHands && rastreioMaoPronto) {
    fill(250, 222, 128);
    textSize(15);
    text("Aproxime a mao da camara e mantenha-a visivel", centerX, 558);
  }

  if (okHand) {
    framesSegurarOK = min(framesSegurarOK + 1.15, 48);
  } else {
    framesSegurarOK = max(framesSegurarOK - 0.45, 0);
  }
  if (framesSegurarOK > 0) {
    const progress = constrain(framesSegurarOK / 36, 0, 1);
    const anelX = okHand ? okHand.indexX : centerX - 120;
    const anelY = okHand ? okHand.indexY : yInicio + 8;
    desenharAnelProgresso(anelX, anelY, progress, color(74, 242, 176));
  }
  if (framesSegurarOK >= 36) {
    iniciarExercicio();
  }

  if (handInCenter) {
    framesSegurarCentro = min(framesSegurarCentro + 1, 48);
  } else {
    framesSegurarCentro = max(framesSegurarCentro - 0.4, 0);
  }
  if (framesSegurarCentro > 0) {
    const progress = constrain(framesSegurarCentro / 34, 0, 1);
    desenharAnelProgresso(centerX, centerY - 30, progress, color(255, 218, 94));
  }
  if (framesSegurarCentro >= 34) {
    iniciarExercicio();
  }

  if (handOnStartButton) {
    framesSegurarBotaoMao = min(framesSegurarBotaoMao + 1.2, 48);
  } else {
    framesSegurarBotaoMao = max(framesSegurarBotaoMao - 0.55, 0);
  }
  if (framesSegurarBotaoMao > 0) {
    const progress = constrain(framesSegurarBotaoMao / 32, 0, 1);
    desenharAnelProgresso(centerX, yInicio + botaoIniciar.h * 0.5, progress, color(76, 233, 174));
  }
  if (framesSegurarBotaoMao >= 32) {
    iniciarExercicio();
  }
}

function desenharSeletorDificuldadeInicio(handInfos, centerX, y) {
  const w = 112;
  const h = 38;
  const gap = 10;
  const total = w * 3 + gap * 2;
  const x0 = centerX - total * 0.5;

  fill(225, 241, 251);
  textAlign(CENTER, TOP);
  textSize(15);
  text("Escolha a dificuldade", centerX, y - 28);

  botoesDificuldadeInicio = [
    { level: DIFICULDADE.FACIL, x: x0, y, w, h },
    { level: DIFICULDADE.MEDIO, x: x0 + w + gap, y, w, h },
    { level: DIFICULDADE.DIFICIL, x: x0 + (w + gap) * 2, y, w, h }
  ];

  desenharBotaoDificuldadeInicio(botoesDificuldadeInicio[0], "Facil");
  desenharBotaoDificuldadeInicio(botoesDificuldadeInicio[1], "Medio");
  desenharBotaoDificuldadeInicio(botoesDificuldadeInicio[2], "Dificil");

  let hoveredByHand = null;
  for (const handInfo of handInfos) {
    const gestoDeliberado = handInfo.isOK || !handInfo.isGrabbingStrong;
    if (!gestoDeliberado) continue;

    const alvo = botoesDificuldadeInicio.find(
      (btn) =>
        pontoDentroRetangulo(handInfo.indexX, handInfo.indexY, btn) ||
        pontoDentroRetangulo(handInfo.palmX, handInfo.palmY, btn)
    );
    if (alvo) {
      hoveredByHand = alvo.level;
      break;
    }
  }

  if (hoveredByHand == null) return;

  const hoveredBtn = botoesDificuldadeInicio.find((btn) => btn.level === hoveredByHand);
  if (hoveredBtn) {
    noFill();
    stroke(255, 255, 255, 210);
    strokeWeight(2);
    rect(hoveredBtn.x - 3, hoveredBtn.y - 3, hoveredBtn.w + 6, hoveredBtn.h + 6, 10);
    noStroke();
  }
}

function desenharBotaoDificuldadeInicio(btn, label) {
  const isActive = nivelDificuldade === btn.level;
  const isHovered = pontoDentroRetangulo(mouseX, mouseY, btn);

  const base = isActive ? color(57, 199, 145) : color(255, 255, 255, 28);
  const drawColor = isHovered ? lerpColor(base, color(255), 0.14) : base;

  noStroke();
  fill(drawColor);
  rect(btn.x, btn.y, btn.w, btn.h, 8);

  fill(isActive ? color(7, 44, 27) : color(225));
  textAlign(CENTER, CENTER);
  textSize(14);
  text(label, btn.x + btn.w * 0.5, btn.y + btn.h * 0.54);
}

// Rasto visual do dedo no modo trajeto (bom vs fora da linha).
function desenharRasto() {
  if (rastoTrajeto.length < 2) return;
  strokeWeight(3);
  for (let i = 1; i < rastoTrajeto.length; i++) {
    const a = rastoTrajeto[i - 1];
    const b = rastoTrajeto[i];
    stroke(a.good ? color(44, 230, 137, 182) : color(255, 78, 78, 186));
    line(a.x, a.y, b.x, b.y);
  }
}

// Barra inferior de progresso do avancar no trajeto.
function desenharAlvoTrajeto() {
  const x = 35 + (layout.camW - 90) * constrain(progressoTrajeto, 0, 1);
  const y = height - 35;

  stroke(255, 255, 255, 90);
  strokeWeight(2);
  line(35, y, layout.camW - 55, y);

  noStroke();
  fill(255, 210, 72);
  circle(x, y, 15);
}

// Ecra final com resultados e reinicio por gesto junto ao botao.
function desenharEcraFinal(handInfos) {
  fill(0, 0, 0, 125);
  noStroke();
  rect(60, 78, layout.camW - 120, height - 173, 24);

  fill(255);
  textAlign(CENTER, TOP);
  textSize(36);
  text("Sessao concluida", layout.camW * 0.5, 122);

  textSize(24);
  text("Bolas apanhadas: " + pontuacaoBolas, layout.camW * 0.5, 214);
  text("");
  text("Precisao media: " + precisaoMovimento + "%", layout.camW * 0.5, 294);
  text("Tempo restante: " + segundosRestantes + "s", layout.camW * 0.5, 334);

  const restartBox = {
    x: layout.camW * 0.5 - 165,
    y: 390,
    w: 330,
    h: 72
  };

  fill(58, 204, 124);
  rect(restartBox.x, restartBox.y, restartBox.w, restartBox.h, 14);
  fill(7, 44, 27);
  textSize(24);
  text("Reiniciar", layout.camW * 0.5, restartBox.y + 21);

  fill(235);
  textSize(15);
  text("Aproxime a mao ao botao e segure 1s", layout.camW * 0.5, 474);

  const restartHand = handInfos.find((h) => {
    const palmInside = pontoDentroRetangulo(h.palmX, h.palmY, restartBox);
    const indexInside = pontoDentroRetangulo(h.indexX, h.indexY, restartBox);
    const deliberateGesture = h.isOK || !h.isGrabbing;
    return deliberateGesture && (palmInside || indexInside);
  });

  if (restartHand) {
    framesSegurarReiniciarFim++;
    const p = constrain(framesSegurarReiniciarFim / 30, 0, 1);
    desenharAnelProgresso(restartHand.palmX, restartHand.palmY, p, color(58, 204, 124));
    if (framesSegurarReiniciarFim > 30) {
      iniciarExercicio();
      framesSegurarReiniciarFim = 0;
    }
  } else {
    framesSegurarReiniciarFim = 0;
  }

  desenharSeletorDificuldadeFim(handInfos);
}

// Controlos rapidos na area da camara com interacao por dedo (segurar).
function obterGeometriaControlosCamara() {
  const y = layout.framePad + 86;
  const gap = 10;
  const btnH = 54;
  const btnW = 156;
  const rightPad = layout.framePad + 20;

  const finishBtn = {
    x: layout.camW - rightPad - btnW,
    y,
    w: btnW,
    h: btnH,
    key: "finish"
  };
  const restartBtn = {
    x: finishBtn.x - gap - btnW,
    y,
    w: btnW,
    h: btnH,
    key: "restart"
  };

  return { restartBtn, finishBtn };
}

// Controlos rapidos na area da camara com interacao por dedo (segurar).
function desenharControlosCamara(handInfos) {
  if (estadoApp !== ESTADO_APP.EXERCISE) return;

  const { restartBtn, finishBtn } = obterGeometriaControlosCamara();
  const y = restartBtn.y;
  const btnH = restartBtn.h;

  botoesCamara.restart = restartBtn;
  botoesCamara.finish = finishBtn;

  const hoveredMouseRestart = pontoDentroRetangulo(mouseX, mouseY, restartBtn);
  const hoveredMouseFinish = pontoDentroRetangulo(mouseX, mouseY, finishBtn);

  let hoveredByHand = null;
  for (const handInfo of handInfos) {
    const gestoDeliberado = handInfo.isOK || !handInfo.isGrabbingStrong;
    if (!gestoDeliberado) continue;

    if (
      pontoDentroRetangulo(handInfo.indexX, handInfo.indexY, restartBtn) ||
      pontoDentroRetangulo(handInfo.palmX, handInfo.palmY, restartBtn)
    ) {
      hoveredByHand = "restart";
      break;
    }
    if (
      pontoDentroRetangulo(handInfo.indexX, handInfo.indexY, finishBtn) ||
      pontoDentroRetangulo(handInfo.palmX, handInfo.palmY, finishBtn)
    ) {
      hoveredByHand = "finish";
      break;
    }
  }

  drawButton(restartBtn, "Reiniciar", color(64, 184, 255), {
    isHovered: hoveredMouseRestart || hoveredByHand === "restart",
    isActive: acaoSegurarCamara === "restart"
  });
  drawButton(finishBtn, "Terminar", color(255, 113, 98), {
    isHovered: hoveredMouseFinish || hoveredByHand === "finish",
    isActive: acaoSegurarCamara === "finish"
  });

  if (millis() < cooldownControloCamaraAte) {
    acaoSegurarCamara = null;
    framesSegurarCamara = 0;
    return;
  }

  if (controloCamaraPrecisaLargar) {
    if (!hoveredByHand) {
      controloCamaraPrecisaLargar = false;
    }
    acaoSegurarCamara = null;
    framesSegurarCamara = 0;
    return;
  }

  if (!hoveredByHand) {
    framesSegurarCamara = max(framesSegurarCamara - 0.7, 0);
    if (framesSegurarCamara <= 0.01) {
      framesSegurarCamara = 0;
      acaoSegurarCamara = null;
    }
  } else {
    if (hoveredByHand === acaoSegurarCamara) {
      framesSegurarCamara = min(framesSegurarCamara + 1, 42);
    } else {
      acaoSegurarCamara = hoveredByHand;
      framesSegurarCamara = max(framesSegurarCamara * 0.55, 1);
    }
  }

  if (acaoSegurarCamara && framesSegurarCamara > 0) {
    const p = constrain(framesSegurarCamara / 28, 0, 1);
    const anelX =
      acaoSegurarCamara === "finish"
        ? finishBtn.x + finishBtn.w * 0.5
        : restartBtn.x + restartBtn.w * 0.5;
    const anelY = y + btnH + 24;
    desenharAnelProgresso(anelX, anelY, p, color(255, 230, 138));
  }

  if (framesSegurarCamara >= 28) {
    if (acaoSegurarCamara === "restart") {
      iniciarExercicio();
    } else if (acaoSegurarCamara === "finish") {
      estadoApp = ESTADO_APP.END;
    }
    cooldownControloCamaraAte = millis() + 800;
    controloCamaraPrecisaLargar = true;
    acaoSegurarCamara = null;
    framesSegurarCamara = 0;
  }
}

// Mostra o tempo restante no canto superior direito da area da camara.
function desenharTempoRestanteCamara() {
  if (estadoApp === ESTADO_APP.CONFIG) return;

  const w = 150;
  const h = 44;
  const gap = 10;
  const xTempo = layout.camW - layout.framePad - 16 - w;
  const xBolas = xTempo - gap - w;
  const y = layout.framePad + 20;

  desenharBadgeCamaraInfo(xBolas, y, w, h, "Bolas", String(pontuacaoBolas));
  desenharBadgeCamaraInfo(xTempo, y, w, h, "Tempo", segundosRestantes + "s");
}

function desenharBadgeCamaraInfo(x, y, w, h, titulo, valor) {

  noStroke();
  fill(6, 25, 40, 205);
  rect(x, y, w, h, 11);

  fill(214, 241, 255);
  textAlign(CENTER, CENTER);
  textSize(13);
  text(titulo, x + w * 0.5, y + 13);

  fill(255);
  textSize(17);
  text(valor, x + w * 0.5, y + 30);
}

// Seletor de dificuldade no fim da sessao com suporte a clique e dedo.
function desenharSeletorDificuldadeFim(handInfos) {
  const y = 540;
  const w = 108;
  const h = 38;
  const gap = 10;
  const total = w * 3 + gap * 2;
  const x0 = layout.camW * 0.5 - total * 0.5;

  fill(220);
  textAlign(CENTER, TOP);
  textSize(14);
  text("Dificuldade para proxima sessao", layout.camW * 0.5, y - 28);

  botoesDificuldadeFim = [
    { level: DIFICULDADE.FACIL, x: x0, y, w, h },
    { level: DIFICULDADE.MEDIO, x: x0 + w + gap, y, w, h },
    { level: DIFICULDADE.DIFICIL, x: x0 + (w + gap) * 2, y, w, h }
  ];

  desenharBotaoDificuldadeFim(botoesDificuldadeFim[0], "Facil");
  desenharBotaoDificuldadeFim(botoesDificuldadeFim[1], "Medio");
  desenharBotaoDificuldadeFim(botoesDificuldadeFim[2], "Dificil");

  let hoveredByHand = null;
  for (const handInfo of handInfos) {
    const gestoDeliberado = handInfo.isOK || !handInfo.isGrabbingStrong;
    if (!gestoDeliberado) continue;

    const alvo = botoesDificuldadeFim.find(
      (btn) =>
        pontoDentroRetangulo(handInfo.indexX, handInfo.indexY, btn) ||
        pontoDentroRetangulo(handInfo.palmX, handInfo.palmY, btn)
    );
    if (alvo) {
      hoveredByHand = alvo.level;
      break;
    }
  }

  if (hoveredByHand == null) {
    acaoSegurarDificuldadeFim = null;
    framesSegurarDificuldadeFim = max(framesSegurarDificuldadeFim - 0.6, 0);
    return;
  }

  if (hoveredByHand === acaoSegurarDificuldadeFim) {
    framesSegurarDificuldadeFim = min(framesSegurarDificuldadeFim + 1, 38);
  } else {
    acaoSegurarDificuldadeFim = hoveredByHand;
    framesSegurarDificuldadeFim = 1;
  }

  const alvoBtn = botoesDificuldadeFim.find((b) => b.level === acaoSegurarDificuldadeFim);
  if (alvoBtn) {
    const p = constrain(framesSegurarDificuldadeFim / 22, 0, 1);
    desenharAnelProgresso(alvoBtn.x + alvoBtn.w * 0.5, alvoBtn.y + alvoBtn.h + 18, p, color(112, 245, 188));
  }

  if (framesSegurarDificuldadeFim >= 22) {
    definirDificuldade(acaoSegurarDificuldadeFim);
    framesSegurarDificuldadeFim = 0;
    acaoSegurarDificuldadeFim = null;
  }
}

function desenharBotaoDificuldadeFim(btn, label) {
  const isActive = nivelDificuldade === btn.level;
  const isHovered = pontoDentroRetangulo(mouseX, mouseY, btn);

  const base = isActive ? color(57, 199, 145) : color(255, 255, 255, 28);
  const drawColor = isHovered ? lerpColor(base, color(255), 0.14) : base;

  noStroke();
  fill(drawColor);
  rect(btn.x, btn.y, btn.w, btn.h, 8);

  fill(isActive ? color(7, 44, 27) : color(225));
  textAlign(CENTER, CENTER);
  textSize(13);
  text(label, btn.x + btn.w * 0.5, btn.y + btn.h * 0.54);
}

// Painel lateral com instrucoes, controlos e metricas da sessao.
function desenharPainelDireito(handInfos) {
  push();
  translate(layout.panelX, 0);

  const blockX = 14;
  const blockW = layout.panelW - blockX * 2;

  fill(5, 20, 34, 228);
  noStroke();
  rect(0, 0, layout.panelW, height);

  fill(255);
  textAlign(LEFT, TOP);
  textSize(22);
  text("Painel", 22, 18);

  desenharBlocoPainel(blockX, 60, blockW, 126, "Instrucoes", obterInstrucaoAtual());
  desenharBlocoControlos(handInfos, blockX, blockW);
  desenharBlocoPainel(
    blockX,
    398,
    blockW,
    112,
    "Monitorizacao",
    obterConteudoMonitorizacaoPainel()
  );
  desenharBlocoPainel(
    blockX,
    522,
    blockW,
    98,
    estadoApp === ESTADO_APP.CONFIG ? "Estado" : "Resultados",
    obterConteudoResultadosPainel(handInfos)
  );

  pop();
}

// Texto de monitorizacao que muda entre configuracao e exercicio.
function obterConteudoMonitorizacaoPainel() {
  if (estadoApp === ESTADO_APP.CONFIG) {
    return (
      "Modo: " +
      obterModoAtual() +
      "\nDificuldade: " +
      NOMES_DIFICULDADE[nivelDificuldade] +
      "\nDuracao: " +
      floor(DURACAO_EXERCICIO_POR_DIFICULDADE[nivelDificuldade] / 60) +
      " min"
    );
  }

  return (
    "Tempo restante: " +
    segundosRestantes +
    "s\nPrecisao: " +
    precisaoMovimento +
    "%\nNivel: " +
    NOMES_DIFICULDADE[nivelDificuldade]
  );
}

// Texto de estado/camara/voz ou resultados finais simplificados.
function obterConteudoResultadosPainel(handInfos) {
  if (estadoApp === ESTADO_APP.CONFIG) {
    const handCount = handInfos.length;
    const trackingState = rastreioMaoPronto ? "Pronto" : "A iniciar";
    return (
      "Camara: " +
      trackingState +
      "\nMaos detetadas: " +
      handCount +
      "\nVoz: " +
      estadoVoz
    );
  }

  return "Bolas: " + pontuacaoBolas;
}

// Cartao base reutilizavel para blocos do painel lateral.
function desenharBlocoPainel(x, y, w, h, title, content) {
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

// Bloco de botoes (reiniciar/terminar) e seletor de dificuldade.
function desenharBlocoControlos(handInfos, x, w) {
  const y = 200;
  const h = 188;

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
  const btnH = 62;
  const restartBtn = { x: x + sidePad, y: y + 40, w: btnW, h: btnH, key: "restart" };
  const finishBtn = {
    x: x + sidePad + btnW + gap,
    y: y + 40,
    w: btnW,
    h: btnH,
    key: "finish"
  };

  botoesPainel.restart = {
    x: layout.panelX + restartBtn.x,
    y: restartBtn.y,
    w: restartBtn.w,
    h: restartBtn.h
  };
  botoesPainel.finish = {
    x: layout.panelX + finishBtn.x,
    y: finishBtn.y,
    w: finishBtn.w,
    h: finishBtn.h
  };

  const selectorY = y + 122;
  const selectorGap = 10;
  const selectorPad = 10;
  const selectorBtnW = (w - selectorPad * 2 - selectorGap * 2) / 3;
  const selectorBtnH = 22;
  botoesDificuldade = [
    {
      level: DIFICULDADE.FACIL,
      x: layout.panelX + x + selectorPad,
      y: selectorY,
      w: selectorBtnW,
      h: selectorBtnH
    },
    {
      level: DIFICULDADE.MEDIO,
      x: layout.panelX + x + selectorPad + selectorBtnW + selectorGap,
      y: selectorY,
      w: selectorBtnW,
      h: selectorBtnH
    },
    {
      level: DIFICULDADE.DIFICIL,
      x: layout.panelX + x + selectorPad + (selectorBtnW + selectorGap) * 2,
      y: selectorY,
      w: selectorBtnW,
      h: selectorBtnH
    }
  ];

  const localMouse = { x: mouseX - layout.panelX, y: mouseY };
  const mouseHoveredRestart = pontoDentroRetangulo(localMouse.x, localMouse.y, restartBtn);
  const mouseHoveredFinish = pontoDentroRetangulo(localMouse.x, localMouse.y, finishBtn);

  let hoveredByHand = null;
  const allowGesturePanelControl = estadoApp === ESTADO_APP.EXERCISE && obterModoAtual() !== MODO.BOLAS;
  if (allowGesturePanelControl && handInfos.length > 0) {
    for (const handInfo of handInfos) {
      // Evita ativacoes acidentais: so aceita controlo com gesto OK
      // e com a mao proxima da lateral direita da camara.
      const inControlEdge = handInfo.palmX > layout.camW - 140;
      if (!handInfo.isOK || !inControlEdge) continue;

      const palmX = mapearXMaoParaPainelLocal(handInfo.palmX, x, w);
      const indexX = mapearXMaoParaPainelLocal(handInfo.indexX, x, w);

      if (
        pontoDentroRetangulo(palmX, handInfo.palmY, restartBtn) ||
        pontoDentroRetangulo(indexX, handInfo.indexY, restartBtn)
      ) {
        hoveredByHand = restartBtn.key;
        break;
      }
      if (
        pontoDentroRetangulo(palmX, handInfo.palmY, finishBtn) ||
        pontoDentroRetangulo(indexX, handInfo.indexY, finishBtn)
      ) {
        hoveredByHand = finishBtn.key;
        break;
      }
    }
  }

  drawButton(restartBtn, "Reiniciar", color(64, 184, 255), {
    isHovered: mouseHoveredRestart || hoveredByHand === "restart",
    isActive: acaoSegurarPainel === "restart"
  });
  drawButton(finishBtn, "Terminar", color(255, 113, 98), {
    isHovered: mouseHoveredFinish || hoveredByHand === "finish",
    isActive: acaoSegurarPainel === "finish"
  });

  fill(195, 223, 239);
  textAlign(LEFT, TOP);
  textSize(12);
  text("Dificuldade", x + 10, selectorY - 16);

  const podeMudarDificuldade = estadoApp !== ESTADO_APP.EXERCISE;
  desenharBotaoSeletorDificuldade(botoesDificuldade[0], "Facil", podeMudarDificuldade);
  desenharBotaoSeletorDificuldade(botoesDificuldade[1], "Medio", podeMudarDificuldade);
  desenharBotaoSeletorDificuldade(botoesDificuldade[2], "Dificil", podeMudarDificuldade);

  if (estadoApp !== ESTADO_APP.EXERCISE) {
    acaoSegurarPainel = null;
    framesSegurarPainel = 0;
    return;
  }

  const hovered = hoveredByHand;

  if (millis() < cooldownControloPainelAte) {
    acaoSegurarPainel = null;
    framesSegurarPainel = 0;
    return;
  }

  if (controloPainelPrecisaLargar) {
    if (!hovered) {
      controloPainelPrecisaLargar = false;
    }
    acaoSegurarPainel = null;
    framesSegurarPainel = 0;
    return;
  }

  if (!hovered) {
    acaoSegurarPainel = null;
    framesSegurarPainel = 0;
    return;
  }

  if (hovered === acaoSegurarPainel) {
    framesSegurarPainel++;
  } else {
    acaoSegurarPainel = hovered;
    framesSegurarPainel = 1;
  }

  if (framesSegurarPainel > 18) {
    if (acaoSegurarPainel === "restart") {
      iniciarExercicio();
    } else if (acaoSegurarPainel === "finish") {
      estadoApp = ESTADO_APP.END;
    }
    cooldownControloPainelAte = millis() + 900;
    controloPainelPrecisaLargar = true;
    acaoSegurarPainel = null;
    framesSegurarPainel = 0;
  }
}

// Botao generico do painel com estados hover e ativo.
function drawButton(btn, label, c, state = {}) {
  const isHovered = !!state.isHovered;
  const isActive = !!state.isActive;
  const baseColor = isHovered ? lerpColor(c, color(255), 0.16) : c;

  if (isHovered || isActive) {
    noStroke();
    fill(red(baseColor), green(baseColor), blue(baseColor), 85);
    rect(btn.x - 4, btn.y - 4, btn.w + 8, btn.h + 8, 12);
  }

  fill(baseColor);
  rect(btn.x, btn.y, btn.w, btn.h, 10);

  if (isActive) {
    noFill();
    stroke(255, 255, 255, 220);
    strokeWeight(2);
    rect(btn.x + 2, btn.y + 2, btn.w - 4, btn.h - 4, 8);
    noStroke();
  }

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(15);
  text(label, btn.x + btn.w * 0.5, btn.y + btn.h * 0.5);
}

// Botao do seletor de dificuldade (ativo, inativo e hover).
function desenharBotaoSeletorDificuldade(btn, label, enabled) {
  const isActive = nivelDificuldade === btn.level;
  const isHovered = pontoDentroRetangulo(mouseX, mouseY, btn) && enabled;

  const base = isActive ? color(57, 199, 145) : color(255, 255, 255, enabled ? 26 : 14);
  const drawColor = isHovered ? lerpColor(base, color(255), 0.14) : base;

  noStroke();
  fill(drawColor);
  rect(btn.x - layout.panelX, btn.y, btn.w, btn.h, 8);

  fill(isActive ? color(7, 44, 27) : color(220));
  textAlign(CENTER, CENTER);
  textSize(12);
  text(label, btn.x - layout.panelX + btn.w * 0.5, btn.y + btn.h * 0.54);
}

// Silhueta guia para posicionamento corporal no ecra inicial.
function desenharGuiaCorpo(cx, cy) {
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
  ellipse(cx, cy - 34, 210, 104);
}

// Renderiza esqueleto de mao com keypoints espelhados da camara.
function desenharEsqueletoMao() {
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

    stroke(255, 245, 185, 170);
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
      const point = mirror(kp[i]);
      fill(i === 8 ? color(36, 236, 136) : color(255, 255, 255, 188));
      circle(point.x, point.y, i === 8 ? 9 : 6);
    }
  }
}

// Cursor circular para realcar ponto de interacao da mao/dedo.
function desenharCursorMao(x, y, good) {
  noFill();
  stroke(good ? color(37, 235, 132) : color(255, 107, 107));
  strokeWeight(3);
  circle(x, y, 26);

  noStroke();
  fill(good ? color(37, 235, 132, 182) : color(255, 107, 107, 182));
  circle(x, y, 10);
}

// Anel de progresso usado em interacoes por "segurar".
function desenharAnelProgresso(x, y, p, c) {
  noFill();
  stroke(255, 255, 255, 95);
  strokeWeight(4);
  arc(x, y, 48, 48, -HALF_PI, TWO_PI - HALF_PI);

  stroke(c);
  strokeWeight(5);
  arc(x, y, 48, 48, -HALF_PI, -HALF_PI + TWO_PI * p);
}

// Overlay inferior com dicas contextuais de assistencia.
function desenharOverlayDica() {
  if (!assistencia.tip || millis() > assistencia.until) return;

  const w = 560;
  const h = 56;
  const x = (layout.camW - w) * 0.5;
  const y = height - 92;

  fill(5, 17, 31, 210);
  stroke(116, 239, 255, 120);
  strokeWeight(1.5);
  rect(x, y, w, h, 14);

  noStroke();
  fill(226, 247, 255);
  textAlign(CENTER, CENTER);
  textSize(17);
  text(assistencia.tip, x + w * 0.5, y + h * 0.5);
}
