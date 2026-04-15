# CatchMotion 🖐️🎯

**CatchMotion** é uma aplicação interativa concebida para apoiar exercícios de fisioterapia motora. Através da utilização de visão computacional e reconhecimento de voz, a aplicação transforma a reabilitação num jogo dinâmico, permitindo que os utilizadores realizem exercícios de mobilidade de forma lúdica e recebam feedback em tempo real.

---

## 🚀 Funcionalidades Principais

### 🖐️ Interação Natural (HandPose)
A aplicação utiliza a câmara para mapear os movimentos do utilizador sem necessidade de comandos físicos:
- **Seguimento de Precisão:** Deteta o dedo indicador para interagir com os elementos no ecrã.
- **Deteção de Gestos:** Reconhece movimentos específicos para selecionar opções e realizar o exercício.

### 🗣️ Comandos de Voz (Web Speech API)
Controlo total do fluxo da aplicação através da voz, ideal para utilizadores com mobilidade reduzida nas mãos:
- **"Iniciar":** Começa o exercício a partir do ecrã inicial.
- **"Terminar":** Interrompe a sessão atual.
- **"Reiniciar":** Volta a tentar o exercício após ver os resultados.

### 📈 Modo de Exercício: Apanhar Bolas
- **Dificuldade Adaptativa:** Três níveis (Fácil, Médio e Difícil) que ajustam a velocidade e o tamanho dos alvos.
- **Feedback em Tempo Real:** Visualização de métricas, dicas de postura e estado do exercício diretamente na interface.

---

## 🛠️ Tecnologias Utilizadas

- **Linguagens:** HTML5, CSS3, JavaScript.
- **Gráficos e Ciclo de Jogo:** [p5.js](https://p5js.org/).
- **Inteligência Artificial:** [ml5.js](https://ml5js.org/) (Modelo HandPose para deteção de mãos).
- **Voz:** Web Speech API para reconhecimento de comandos em português (pt-PT).

---

## 📦 Como Executar

1. **Clonar/Descarregar:** Transfere os ficheiros do projeto para a tua máquina.
2. **Servidor Local:** Abre a pasta no VS Code e utiliza a extensão **Live Server** (essencial para permissões de câmara/microfone).
3. **Navegador:** Acede a `http://localhost:5500`.
4. **Permissões:** Aceita o acesso à **Câmara** e ao **Microfone** quando o navegador solicitar.

> **Nota:** Se abrir o ficheiro `index.html` diretamente (file://), algumas funcionalidades de voz podem ser bloqueadas por segurança pelo navegador.

---

## 📖 Instruções de Uso

1. **Configuração:** No ecrã inicial, seleciona a dificuldade usando as teclas `1`, `2` ou `3`, ou clicando nos botões.
2. **Controlo por Teclado:** - `Enter`: Inicia o exercício.
3. **Interação Gestual:**
   - Move a mão em frente à câmara; o círculo no ecrã seguirá o teu dedo indicador.
   - Posiciona o cursor sobre as bolas para as "apanhar".
4. **Voz:** Diz claramente os comandos "iniciar", "terminar" ou "reiniciar" conforme a fase do exercício.

---

## 📂 Estrutura do Projeto

* `sketch.js`: Gestão do ciclo principal (setup e desenho).
* `js/estado.js`: Controlo de variáveis globais e configurações.
* `js/interacao.js`: Gestão de inputs (mão, voz, rato e teclado).
* `js/modos.js`: Lógica específica do jogo "Apanhar Bolas".
* `js/renderizacao.js`: Interface gráfica e elementos visuais.

---

## 📄 Licença

Este projeto foi desenvolvido para fins académicos no âmbito da unidade curricular de **Tecnologias Interativas**, com foco no estudo de interfaces de utilizador naturais (NUI) aplicadas à saúde.
