// Carrega o modelo de deteção de mãos antes do setup.
function preload() {
  handPose = ml5.handPose();
  carregarImagensObjetos();
}

// Inicializa canvas, câmara, deteção de mãos, voz e sessão.
function setup() {
  const canvas = createCanvas(layout.totalW, layout.totalH);
  canvas.parent("app");

  textFont("Manrope");
  video = createCapture(VIDEO);
  video.size(layout.camW, layout.totalH);
  video.attribute("playsinline", "");
  video.hide();

  handPose.detectStart(video, receberMaos);
  iniciarReconhecimentoVoz();
  reiniciarSessao();
}

// Ciclo principal: desenha cena, atualiza estado e UI por frame.
function draw() {
  desenharFundo();
  desenharVideoEspelhado();

  const handInfos = obterInfoMaos();
  desenharEsqueletoMao();
  updateAssistanceMovement(handInfos);

  if (estadoApp === ESTADO_APP.CONFIG) {
    desenharEcraConfiguracao(handInfos);
  } else if (estadoApp === ESTADO_APP.COUNTDOWN) {
    atualizarContagemExercicio();
    if (estadoApp === ESTADO_APP.COUNTDOWN) {
      desenharOverlayContagem();
      desenharTempoRestanteCamara();
    }
  } else if (estadoApp === ESTADO_APP.EXERCISE) {
    segundosDecorridos = floor((millis() - inicioMillis) / 1000);
    segundosRestantes = max(segundosTotaisExercicio - segundosDecorridos, 0);
    executarExercicio(handInfos);
    desenharTempoRestanteCamara();
    desenharControlosCamara(handInfos);

    if (segundosRestantes <= 0) {
      estadoApp = ESTADO_APP.END;
    }
  } else {
    desenharEcraFinal(handInfos);
    desenharTempoRestanteCamara();
  }

  desenharPainelDireito(handInfos);
  desenharOverlayDica();
  desenharPopupSelecaoObjetos();
}