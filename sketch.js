// Carrega o modelo de deteccao de maos antes do setup.
function preload() {
  handPose = ml5.handPose();
}

// Inicializa canvas, camara, deteccao de maos, voz e sessao.
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
}