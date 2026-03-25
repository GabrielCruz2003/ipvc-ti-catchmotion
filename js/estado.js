let video;
let handPose;
let hands = [];

// Estados globais da aplicação.

const ESTADO_APP = {
  CONFIG: "config",
  COUNTDOWN: "countdown",
  EXERCISE: "exercise",
  END: "end"
};

const MODO = {
  BOLAS: "Apanhar Bolas",
  TRAJETO: "Seguir o Caminho"
};

const TEMA_OBJETO = {
  BOLAS: "bolas",
  FRUTAS: "frutas",
  OUTROS: "outros",
  PLANETAS: "planetas"
};

const CATALOGO_FRUTAS = [
  { id: "ananas", label: "Ananás", categoria: "frutas", ficheiro: "Ananás.svg" },
  { id: "banana", label: "Banana", categoria: "frutas", ficheiro: "Banana.svg" },
  { id: "cerejas", label: "Cerejas", categoria: "frutas", ficheiro: "Cerejas.svg" },
  { id: "laranja", label: "Laranja", categoria: "frutas", ficheiro: "Laranja.svg" },
  { id: "limao", label: "Limão", categoria: "frutas", ficheiro: "Limão.svg" },
  { id: "maca", label: "Maçã", categoria: "frutas", ficheiro: "Maça.svg" },
  { id: "uvas", label: "Uvas", categoria: "frutas", ficheiro: "Uvas.svg" }
];

const CATALOGO_OUTROS = [
  { id: "estrela", label: "Estrela", categoria: "outros", ficheiro: "estrela.svg" },
  { id: "diamante", label: "Diamante", categoria: "outros", ficheiro: "diamante.svg" },
  { id: "raio", label: "Raio", categoria: "outros", ficheiro: "raio.svg" },
  { id: "alvo", label: "Alvo", categoria: "outros", ficheiro: "alvo.svg" },
  { id: "foguete", label: "Foguete", categoria: "outros", ficheiro: "foguete.svg" }
];

const CATALOGO_PLANETAS = [
  { id: "mercurio", label: "Mercúrio", categoria: "planetas", ficheiro: "Mercúrio.svg" },
  { id: "venus", label: "Vénus", categoria: "planetas", ficheiro: "Vénus.svg" },
  { id: "terra", label: "Terra", categoria: "planetas", ficheiro: "Terra.svg" },
  { id: "marte", label: "Marte", categoria: "planetas", ficheiro: "Marte.svg" },
  { id: "jupiter", label: "Júpiter", categoria: "planetas", ficheiro: "Júpiter.svg" },
  { id: "saturno", label: "Saturno", categoria: "planetas", ficheiro: "Saturno.svg" },
  { id: "urano", label: "Urano", categoria: "planetas", ficheiro: "Urano.svg" },
  { id: "neptuno", label: "Neptuno", categoria: "planetas", ficheiro: "Neptuno.svg" }
];

const DIFICULDADE = {
  FACIL: 0,
  MEDIO: 1,
  DIFICIL: 2
};

// Parâmetros de jogo por dificuldade.
const NOMES_DIFICULDADE = ["Fácil", "Médio", "Difícil"];
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
    velocidadeBolasMul: 1.50,
    quantidadeBolas: 3,
    ancorasTrajeto: 7,
    toleranciaTrajeto: 24,
    msInatividade: 3800,
    limiteDicaErroTrajeto: 2,
    msSemCapturaDica: 3400
  },
  {
    velocidadeBolasMul: 4.50,
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
  // Aumentar largura do painel lateral para melhor legibilidade
  panelW: 420,
  camW: 1560 - 420, // 1140
  panelX: 1560 - 420,
  framePad: 20
};

// Estado da sessão e métricas em tempo real.
let estadoApp = ESTADO_APP.CONFIG;
let indiceModo = 0;
let nivelDificuldade = DIFICULDADE.MEDIO;
let temaObjetos = TEMA_OBJETO.BOLAS;
let frutasSelecionadas = ["banana", "laranja", "maca"];
let outrosSelecionados = ["estrela", "diamante", "raio"];
let planetasSelecionados = ["mercurio", "venus", "terra"];

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
let botoesTemaObjetos = [];
let botoesFrutasConfig = [];
let botoesOutrosConfig = [];
let botoesTemaObjetosPainel = [];

let reconhecedorVoz = null;
let vozPronta = false;
let estadoVoz = "A iniciar";
let ultimoComandoVoz = "Nenhum";

const CONTAGEM_INICIAL_SEGUNDOS = 3;
let contagemAtual = CONTAGEM_INICIAL_SEGUNDOS;
let contagemInicioMillis = 0;
let osciladorContagem = null;
let osciladorInicio = null;
let atlasObjetos = {};

// Estado do popup de seleção de objetos.
let popupObjetoAberto = false;
let popupTemaSelecionado = null;
let botoesPopupObjetos = [];
let botoesPopupFechar = null;

// Estado da assistência visual contextual.
const assistencia = {
  tip: "",
  until: 0,
  lastGoodActionMs: 0,
  lastMoveMs: 0,
  ultimoContadorErrosTrajeto: 0,
  lastPalm: null
};
