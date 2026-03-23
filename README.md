# CatchMotion

Aplicação interativa para apoio a exercícios de fisioterapia motora, com deteção de mãos em tempo real e comandos de voz em português.

## Funcionalidades

- Modo de exercício implementado: Apanhar Bolas
- Três níveis de dificuldade: Fácil, Médio e Difícil
- Deteção de mãos via câmara (gestos e seguimento do dedo indicador)
- Comandos de voz (pt-PT): iniciar, terminar e reiniciar
- Feedback visual em tempo real (estado, dicas e métricas)

## Tecnologias

- HTML5
- CSS3
- JavaScript
- p5.js
- ml5.js (HandPose)
- Web Speech API

## Estrutura do projeto

- `index.html` - página principal e carregamento de scripts
- `styles.css` - estilos da interface
- `sketch.js` - ciclo principal (setup/draw)
- `js/estado.js` - estado global, constantes e configuração
- `js/interacao.js` - input (mão, rato, teclado e voz)
- `js/modos.js` - lógica dos modos de jogo
- `js/renderizacao.js` - desenho da interface e elementos visuais

## Como executar

1. Abrir a pasta do projeto no VS Code.
2. Iniciar um servidor local na pasta raiz (ex.: extensão Live Server).
3. Abrir a aplicação no navegador através do endereço local (ex.: `http://localhost:5500`).
4. Permitir acesso à câmara e ao microfone quando solicitado.

Também é possível abrir o `index.html` diretamente, mas algumas funcionalidades de câmara/voz podem depender do navegador e do contexto seguro (`localhost` ou `https`).

## Controlos rápidos

- Teclado:
	- `1`, `2`, `3` definem dificuldade
	- `Enter` inicia no ecrã inicial
- Voz:
	- "iniciar" (ecrã inicial)
	- "terminar" (durante exercício)
	- "reiniciar" (ecrã final)
- Rato e gestos:
	- Seleção de botões e dificuldade através da interface

## Estado atual

Nesta versão, apenas o modo **Apanhar Bolas** está considerado como funcionalidade concluída.

## Objetivo académico

Projeto desenvolvido no contexto da unidade curricular de Tecnologias Interativas, com foco em interação natural (visão computacional + voz) aplicada à reabilitação motora.