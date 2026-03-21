let video;
let handPose;
let hands = [];

// Estados globais da aplicacao.

const ESTADO_APP = {
  CONFIG: "config",
  EXERCISE: "exercise",
  END: "end"
};

const MODO = {
  BOLAS: "Apanhar Bolas",
  TRAJETO: "Seguir o Caminho"
};

const DIFICULDADE = {
  FACIL: 0,
  MEDIO: 1,
  DIFICIL: 2
};

// Parametros de jogo por dificuldade.
const NOMES_DIFICULDADE = ["Facil", "Medio", "Dificil"];
const DURACAO_EXERCICIO_POR_DIFICULDADE = [180, 120, 60];

const PERFIL_DIFICULDADE = [
  {
    velocidadeBolasMul: 0.85,
    quantidadeBolas: 2,
    ancorasTrajeto: 5,
    toleranciaTrajeto: 32,
    msInatividade: 5000,
    limiteDicaErroTrajeto: 2,
    msSemCapturaDica: 4200
  },
  {
    velocidadeBolasMul: 1.05,
    quantidadeBolas: 3,
    ancorasTrajeto: 7,
    toleranciaTrajeto: 24,
    msInatividade: 3800,
    limiteDicaErroTrajeto: 2,
    msSemCapturaDica: 3400
  },
  {
    velocidadeBolasMul: 1.25,
    quantidadeBolas: 4,
    ancorasTrajeto: 9,
    toleranciaTrajeto: 18,
    msInatividade: 3000,
    limiteDicaErroTrajeto: 1,
    msSemCapturaDica: 2600
  }
];

const layout = {
  totalW: 1560,
  totalH: 675,
  camW: 1200,
  panelW: 360,
  panelX: 1200,
  framePad: 20
};

// Estado da sessao e metricas em tempo real.
let estadoApp = ESTADO_APP.CONFIG;
let indiceModo = 0;
let nivelDificuldade = DIFICULDADE.MEDIO;

let inicioMillis = 0;
let segundosDecorridos = 0;
let segundosTotaisExercicio = DURACAO_EXERCICIO_POR_DIFICULDADE[DIFICULDADE.MEDIO];
let segundosRestantes = segundosTotaisExercicio;

let pontuacaoBolas = 0;
let errosTrajeto = 0;
let precisaoMovimento = 100;
let progressoTrajeto = 0;

let bolas = [];
let pontosTrajeto = [];
let rastoTrajeto = [];
let maxRasto = 180;
let trajetoEstavaNaLinha = true;
let handGrabStableFrames = [0, 0];

let tomEstado = "neutral";
let framesFlashEstado = 0;

let framesSegurarOK = 0;
let framesSegurarCentro = 0;
let framesSegurarBotaoMao = 0;
let rastreioMaoPronto = false;
let acaoSegurarPainel = null;
let framesSegurarPainel = 0;
let framesSegurarReiniciarFim = 0;
let acaoSegurarCamara = null;
let framesSegurarCamara = 0;
let cooldownControloCamaraAte = 0;
let controloCamaraPrecisaLargar = false;
let acaoSegurarDificuldadeFim = null;
let framesSegurarDificuldadeFim = 0;
let cooldownControloPainelAte = 0;
let controloPainelPrecisaLargar = false;

// Geometria de UI interativa.
const botaoIniciar = {
  x: 0,
  y: 0,
  w: 300,
  h: 72
};

const botoesPainel = {
  restart: null,
  finish: null
};
const botoesCamara = {
  restart: null,
  finish: null
};
let botoesDificuldade = [];
let botoesDificuldadeInicio = [];
let botoesDificuldadeFim = [];

let reconhecedorVoz = null;
let vozPronta = false;
let estadoVoz = "A iniciar";
let ultimoComandoVoz = "Nenhum";

// Estado da assistencia visual contextual.
const assistencia = {
  tip: "",
  until: 0,
  lastGoodActionMs: 0,
  lastMoveMs: 0,
  ultimoContadorErrosTrajeto: 0,
  lastPalm: null
};
