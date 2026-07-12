const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

ctx.imageSmoothingEnabled = false;

// =====================================================
// IMAGEM
// =====================================================

const spriteSheet = new Image();
spriteSheet.src = "spritesheet-1.png (1).png";

// =====================================================
// ESTADOS
// =====================================================

const ESTADO = {
    MENU: "menu",
    JOGANDO: "jogando",
    GAME_OVER: "game_over"
};

let estadoAtual = ESTADO.MENU;

// =====================================================
// PONTUAÇÃO
// =====================================================

let pontos = 0;
let moedasColetadas = 0;
let derrotados = 0;

let recorde =
    Number(localStorage.getItem("recordeTriangleRun")) || 0;

// =====================================================
// CENÁRIO E DIFICULDADE
// =====================================================

const alturaDoChao = 70;
const chaoY = canvas.height - alturaDoChao;

const velocidadeInicial = 5;
const velocidadeMaxima = 13;

let velocidadeJogo = velocidadeInicial;
let tempoDeJogo = 0;
let deslocamentoDoChao = 0;

// =====================================================
// RECORTES DA SPRITE SHEET
// =====================================================

const SPRITES = {
    mexicano: {
        x: 2,
        y: 36,
        largura: 36,
        altura: 57
    },

    laranja: {
        x: 54,
        y: 47,
        largura: 36,
        altura: 47
    },

    normal: {
        x: 116,
        y: 47,
        largura: 36,
        altura: 47
    },

    correndo1: {
        x: 153,
        y: 52,
        largura: 62,
        altura: 40
    },

    correndo2: {
        x: 224,
        y: 59,
        largura: 62,
        altura: 34
    },

    atacando1: {
        x: 280,
        y: 49,
        largura: 48,
        altura: 24
    },

    atacando2: {
        x: 285,
        y: 72,
        largura: 43,
        altura: 16
    }
};

// =====================================================
// JOGADOR
// =====================================================

const jogador = {
    x: 115,
    y: 0,

    largura: 95,
    altura: 60,

    velocidadeY: 0,
    gravidade: 0.7,

    // Permite até três saltos antes de tocar no chão
    saltosDisponiveis: 3,
    saltosUsados: 0,

    noChao: true,

    atacando: false,
    tempoAtaque: 0,
    duracaoAtaque: 20,
    numeroDoAtaque: 0,

    frameCorrida: 0,
    contadorFrame: 0
};

function colocarJogadorNoChao() {
    jogador.y = chaoY - jogador.altura;
    jogador.velocidadeY = 0;

    jogador.noChao = true;
    jogador.saltosUsados = 0;
}

colocarJogadorNoChao();

// =====================================================
// TIPOS DE INIMIGO
// =====================================================

const TIPO = {
    NORMAL: "normal",
    MEXICANO: "mexicano",
    LARANJA: "laranja"
};

let inimigos = [];
let tempoParaInimigo = 90;

// =====================================================
// CRIAR INIMIGOS
// =====================================================

function escolherTipoDeInimigo() {
    const dificuldade = Math.min(tempoDeJogo / 3000, 1);
    const sorteio = Math.random();

    const chanceMexicano =
        0.16 + dificuldade * 0.14;

    const chanceLaranja =
        0.23 + dificuldade * 0.12;

    if (sorteio < chanceMexicano) {
        return TIPO.MEXICANO;
    }

    if (
        sorteio <
        chanceMexicano + chanceLaranja
    ) {
        return TIPO.LARANJA;
    }

    return TIPO.NORMAL;
}

function escolherTamanho(tipo) {
    const sorteio = Math.random();

    if (tipo === TIPO.LARANJA) {
        if (sorteio < 0.28) {
            return "gigante";
        }

        if (sorteio < 0.65) {
            return "grande";
        }
    }

    if (sorteio < 0.22) {
        return "grande";
    }

    return "normal";
}

function criarInimigo() {
    const tipo = escolherTipoDeInimigo();
    const tamanho = escolherTamanho(tipo);

    let largura = 65;
    let altura = 85;

    if (tipo === TIPO.MEXICANO) {
        largura = 67;
        altura = 96;
    }

    if (tamanho === "grande") {
        largura *= 1.35;
        altura *= 1.35;
    }

    if (tamanho === "gigante") {
        largura *= 1.7;
        altura *= 1.7;
    }

    inimigos.push({
        tipo,
        tamanho,

        x: canvas.width + 40,
        y: chaoY - altura,

        largura,
        altura,

        vida:
            tipo === TIPO.MEXICANO
                ? 2
                : 1,

        vidaMaxima:
            tipo === TIPO.MEXICANO
                ? 2
                : 1,

        ultimoAtaqueRecebido: -1,

        piscando: 0,
        derrotado: false,
        tempoDerrotado: 0
    });
}

// =====================================================
// MOEDAS
// =====================================================

let moedas = [];
let tempoParaMoeda = 100;

function criarMoeda() {
    const alturasPossiveis = [
        chaoY - 75,
        chaoY - 140,
        chaoY - 215
    ];

    const altura =
        alturasPossiveis[
            Math.floor(
                Math.random() *
                alturasPossiveis.length
            )
        ];

    moedas.push({
        x: canvas.width + 30,
        y: altura,

        raio: 15,
        angulo: 0,
        coletada: false
    });
}

// =====================================================
// PARTÍCULAS
// =====================================================

let particulas = [];

function criarParticulas(
    x,
    y,
    quantidade,
    cor
) {
    for (let i = 0; i < quantidade; i++) {
        particulas.push({
            x,
            y,

            velocidadeX:
                -3 + Math.random() * 6,

            velocidadeY:
                -4 + Math.random() * 5,

            tamanho:
                3 + Math.random() * 5,

            vida:
                20 + Math.random() * 20,

            cor
        });
    }
}

// =====================================================
// CONTROLES
// =====================================================

function pular() {
    if (estadoAtual === ESTADO.MENU) {
        iniciarJogo();
        return;
    }

    if (estadoAtual === ESTADO.GAME_OVER) {
        iniciarJogo();
        return;
    }

    if (estadoAtual !== ESTADO.JOGANDO) {
        return;
    }

    if (
        jogador.saltosUsados >=
        jogador.saltosDisponiveis
    ) {
        return;
    }

    jogador.saltosUsados++;

    /*
        Primeiro salto: mais forte.
        Segundo salto: médio.
        Terceiro salto: um pouco menor.
    */

    if (jogador.saltosUsados === 1) {
        jogador.velocidadeY = -12.5;
    }

    if (jogador.saltosUsados === 2) {
        jogador.velocidadeY = -10.5;
    }

    if (jogador.saltosUsados === 3) {
        jogador.velocidadeY = -9;
    }

    jogador.noChao = false;
}

function atacar() {
    if (estadoAtual !== ESTADO.JOGANDO) {
        return;
    }

    if (jogador.atacando) {
        return;
    }

    jogador.atacando = true;
    jogador.tempoAtaque =
        jogador.duracaoAtaque;

    jogador.numeroDoAtaque++;
}

document.addEventListener(
    "keydown",
    function (evento) {
        if (
            evento.code === "Space" ||
            evento.code === "ArrowUp"
        ) {
            evento.preventDefault();
            pular();
        }

        if (
            evento.code === "KeyX" ||
            evento.code === "ArrowDown"
        ) {
            evento.preventDefault();
            atacar();
        }
    }
);

// Clique pula
canvas.addEventListener(
    "click",
    function () {
        pular();
    }
);

// =====================================================
// INICIAR E ENCERRAR
// =====================================================

function iniciarJogo() {
    pontos = 0;
    moedasColetadas = 0;
    derrotados = 0;

    tempoDeJogo = 0;
    velocidadeJogo = velocidadeInicial;

    inimigos = [];
    moedas = [];
    particulas = [];

    tempoParaInimigo = 90;
    tempoParaMoeda = 110;

    jogador.atacando = false;
    jogador.tempoAtaque = 0;
    jogador.numeroDoAtaque = 0;

    colocarJogadorNoChao();

    estadoAtual = ESTADO.JOGANDO;
}

function encerrarJogo() {
    if (estadoAtual !== ESTADO.JOGANDO) {
        return;
    }

    estadoAtual = ESTADO.GAME_OVER;

    const resultado = Math.floor(pontos);

    if (resultado > recorde) {
        recorde = resultado;

        localStorage.setItem(
            "recordeTriangleRun",
            recorde
        );
    }
}

// =====================================================
// ATUALIZAR JOGADOR
// =====================================================

function atualizarJogador() {
    jogador.velocidadeY += jogador.gravidade;
    jogador.y += jogador.velocidadeY;

    const posicaoChao =
        chaoY - jogador.altura;

    if (jogador.y >= posicaoChao) {
        jogador.y = posicaoChao;
        jogador.velocidadeY = 0;

        jogador.noChao = true;
        jogador.saltosUsados = 0;
    } else {
        jogador.noChao = false;
    }

    if (jogador.y < 0) {
        jogador.y = 0;
        jogador.velocidadeY = 0;
    }

    if (jogador.atacando) {
        jogador.tempoAtaque--;

        if (jogador.tempoAtaque <= 0) {
            jogador.atacando = false;
        }
    } else {
        jogador.contadorFrame++;

        if (jogador.contadorFrame >= 9) {
            jogador.frameCorrida =
                jogador.frameCorrida === 0
                    ? 1
                    : 0;

            jogador.contadorFrame = 0;
        }
    }
}

// =====================================================
// ATUALIZAR DIFICULDADE
// =====================================================

function atualizarDificuldade() {
    velocidadeJogo =
        velocidadeInicial +
        tempoDeJogo / 1900;

    velocidadeJogo =
        Math.min(
            velocidadeJogo,
            velocidadeMaxima
        );
}

// =====================================================
// ATUALIZAR INIMIGOS
// =====================================================

function atualizarInimigos() {
    tempoParaInimigo--;

    if (tempoParaInimigo <= 0) {
        criarInimigo();

        const reducao =
            (velocidadeJogo -
                velocidadeInicial) *
            4;

        const minimo =
            Math.max(65, 115 - reducao);

        const variacao =
            Math.max(35, 80 - reducao);

        tempoParaInimigo =
            minimo +
            Math.random() * variacao;
    }

    for (const inimigo of inimigos) {
        inimigo.x -= velocidadeJogo;

        if (inimigo.piscando > 0) {
            inimigo.piscando--;
        }

        if (inimigo.derrotado) {
            inimigo.tempoDerrotado++;
            inimigo.y -= 2;
        }
    }

    inimigos = inimigos.filter(
        function (inimigo) {
            return (
                inimigo.x +
                inimigo.largura >
                -100
            );
        }
    );
}

// =====================================================
// ATUALIZAR MOEDAS
// =====================================================

function atualizarMoedas() {
    tempoParaMoeda--;

    if (tempoParaMoeda <= 0) {
        criarMoeda();

        tempoParaMoeda =
            90 + Math.random() * 140;
    }

    for (const moeda of moedas) {
        moeda.x -= velocidadeJogo;
        moeda.angulo += 0.13;
    }

    moedas = moedas.filter(
        function (moeda) {
            return (
                !moeda.coletada &&
                moeda.x > -40
            );
        }
    );
}

// =====================================================
// ATAQUES
// =====================================================

function verificarAtaques() {
    if (!jogador.atacando) {
        return;
    }

    const golpeAtivo =
        jogador.tempoAtaque <= 15 &&
        jogador.tempoAtaque >= 5;

    if (!golpeAtivo) {
        return;
    }

    const caixaDoAtaque = {
        esquerda:
            jogador.x +
            jogador.largura -
            12,

        direita:
            jogador.x +
            jogador.largura +
            70,

        topo:
            jogador.y + 5,

        base:
            jogador.y +
            jogador.altura -
            4
    };

    for (const inimigo of inimigos) {
        if (
            inimigo.derrotado ||
            inimigo.tipo === TIPO.LARANJA
        ) {
            continue;
        }

        if (
            inimigo.ultimoAtaqueRecebido ===
            jogador.numeroDoAtaque
        ) {
            continue;
        }

        const acertou =
            caixaDoAtaque.direita >
                inimigo.x &&
            caixaDoAtaque.esquerda <
                inimigo.x +
                inimigo.largura &&
            caixaDoAtaque.base >
                inimigo.y &&
            caixaDoAtaque.topo <
                inimigo.y +
                inimigo.altura;

        if (!acertou) {
            continue;
        }

        inimigo.ultimoAtaqueRecebido =
            jogador.numeroDoAtaque;

        inimigo.vida--;
        inimigo.piscando = 8;

        criarParticulas(
            inimigo.x +
                inimigo.largura / 2,

            inimigo.y +
                inimigo.altura / 2,

            10,
            "#ffffff"
        );

        if (inimigo.vida <= 0) {
            inimigo.derrotado = true;
            derrotados++;

            pontos +=
                inimigo.tipo === TIPO.MEXICANO
                    ? 30
                    : 15;

            criarParticulas(
                inimigo.x +
                    inimigo.largura / 2,

                inimigo.y +
                    inimigo.altura / 2,

                20,
                "#46ff78"
            );
        }
    }
}

// =====================================================
// COLISÃO COM INIMIGOS
// =====================================================

function verificarColisoes() {
    const jogadorEsquerda =
        jogador.x + 17;

    const jogadorDireita =
        jogador.x +
        jogador.largura -
        13;

    const jogadorTopo =
        jogador.y + 10;

    const jogadorBase =
        jogador.y +
        jogador.altura -
        7;

    for (const inimigo of inimigos) {
        if (inimigo.derrotado) {
            continue;
        }

        const bateu =
            jogadorDireita >
                inimigo.x + 8 &&
            jogadorEsquerda <
                inimigo.x +
                inimigo.largura -
                8 &&
            jogadorBase >
                inimigo.y + 5 &&
            jogadorTopo <
                inimigo.y +
                inimigo.altura;

        if (bateu) {
            encerrarJogo();
            return;
        }
    }
}

// =====================================================
// COLETAR MOEDAS
// =====================================================

function verificarMoedas() {
    const centroX =
        jogador.x +
        jogador.largura / 2;

    const centroY =
        jogador.y +
        jogador.altura / 2;

    for (const moeda of moedas) {
        const distanciaX =
            centroX - moeda.x;

        const distanciaY =
            centroY - moeda.y;

        const distancia =
            Math.sqrt(
                distanciaX * distanciaX +
                distanciaY * distanciaY
            );

        if (distancia < moeda.raio + 32) {
            moeda.coletada = true;

            moedasColetadas++;
            pontos += 10;

            criarParticulas(
                moeda.x,
                moeda.y,
                14,
                "#ffd52a"
            );
        }
    }
}

// =====================================================
// PARTÍCULAS
// =====================================================

function atualizarParticulas() {
    for (const particula of particulas) {
        particula.x +=
            particula.velocidadeX;

        particula.y +=
            particula.velocidadeY;

        particula.velocidadeY += 0.15;
        particula.vida--;
    }

    particulas = particulas.filter(
        function (particula) {
            return particula.vida > 0;
        }
    );
}

// =====================================================
// ATUALIZAÇÃO PRINCIPAL
// =====================================================

function atualizar() {
    atualizarParticulas();

    if (estadoAtual !== ESTADO.JOGANDO) {
        return;
    }

    tempoDeJogo++;
    pontos += 0.025;

    atualizarDificuldade();
    atualizarJogador();
    atualizarInimigos();
    atualizarMoedas();

    verificarAtaques();
    verificarMoedas();
    verificarColisoes();

    deslocamentoDoChao += velocidadeJogo;

    if (deslocamentoDoChao >= 40) {
        deslocamentoDoChao = 0;
    }
}

// =====================================================
// FUNDO
// =====================================================

function desenharFundo() {
    const gradiente =
        ctx.createLinearGradient(
            0,
            0,
            0,
            canvas.height
        );

    gradiente.addColorStop(0, "#70caf6");
    gradiente.addColorStop(0.7, "#cdf3ff");
    gradiente.addColorStop(1, "#ffffff");

    ctx.fillStyle = gradiente;

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );
}

// =====================================================
// CHÃO
// =====================================================

function desenharChao() {
    ctx.fillStyle = "#ddcb8c";

    ctx.fillRect(
        0,
        chaoY,
        canvas.width,
        alturaDoChao
    );

    ctx.fillStyle = "#47bc43";

    ctx.fillRect(
        0,
        chaoY,
        canvas.width,
        13
    );

    ctx.fillStyle = "#2c8432";

    ctx.fillRect(
        0,
        chaoY + 13,
        canvas.width,
        6
    );

    ctx.strokeStyle =
        "rgba(90,60,30,0.35)";

    ctx.lineWidth = 3;

    for (
        let x =
            -40 - deslocamentoDoChao;
        x < canvas.width + 40;
        x += 40
    ) {
        ctx.beginPath();

        ctx.moveTo(
            x,
            chaoY + 28
        );

        ctx.lineTo(
            x + 18,
            chaoY + 55
        );

        ctx.stroke();
    }
}

// =====================================================
// DESENHAR JOGADOR
// =====================================================

function desenharJogador() {
    let sprite;

    if (jogador.atacando) {
        sprite =
            jogador.tempoAtaque > 10
                ? SPRITES.atacando1
                : SPRITES.atacando2;
    } else {
        sprite =
            jogador.frameCorrida === 0
                ? SPRITES.correndo1
                : SPRITES.correndo2;
    }

    ctx.save();

    const centroX =
        jogador.x +
        jogador.largura / 2;

    const centroY =
        jogador.y +
        jogador.altura / 2;

    ctx.translate(centroX, centroY);

    let inclinacao = 0;

    if (!jogador.noChao) {
        inclinacao =
            Math.max(
                -0.24,
                Math.min(
                    0.28,
                    jogador.velocidadeY *
                    0.016
                )
            );
    }

    ctx.rotate(inclinacao);

    ctx.drawImage(
        spriteSheet,

        sprite.x,
        sprite.y,
        sprite.largura,
        sprite.altura,

        -jogador.largura / 2,
        -jogador.altura / 2,

        jogador.largura,
        jogador.altura
    );

    ctx.restore();
}

// =====================================================
// DESENHAR INIMIGOS
// =====================================================

function spriteDoInimigo(tipo) {
    if (tipo === TIPO.MEXICANO) {
        return SPRITES.mexicano;
    }

    if (tipo === TIPO.LARANJA) {
        return SPRITES.laranja;
    }

    return SPRITES.normal;
}

function desenharInimigos() {
    for (const inimigo of inimigos) {
        const sprite =
            spriteDoInimigo(
                inimigo.tipo
            );

        ctx.save();

        if (
            inimigo.piscando > 0 &&
            inimigo.piscando % 2 === 0
        ) {
            ctx.globalAlpha = 0.3;
        }

        if (inimigo.derrotado) {
            ctx.translate(
                inimigo.x +
                    inimigo.largura / 2,

                inimigo.y +
                    inimigo.altura / 2
            );

            ctx.rotate(
                inimigo.tempoDerrotado *
                0.15
            );

            ctx.globalAlpha =
                Math.max(
                    0,
                    1 -
                    inimigo.tempoDerrotado /
                    28
                );

            ctx.drawImage(
                spriteSheet,

                sprite.x,
                sprite.y,
                sprite.largura,
                sprite.altura,

                -inimigo.largura / 2,
                -inimigo.altura / 2,

                inimigo.largura,
                inimigo.altura
            );
        } else {
            ctx.drawImage(
                spriteSheet,

                sprite.x,
                sprite.y,
                sprite.largura,
                sprite.altura,

                inimigo.x,
                inimigo.y,

                inimigo.largura,
                inimigo.altura
            );
        }

        ctx.restore();

        if (
            inimigo.tipo ===
                TIPO.MEXICANO &&
            !inimigo.derrotado
        ) {
            desenharVida(inimigo);
        }
    }
}

function desenharVida(inimigo) {
    for (let i = 0; i < 2; i++) {
        ctx.fillStyle =
            i < inimigo.vida
                ? "#ef3340"
                : "rgba(20,20,20,0.35)";

        ctx.fillRect(
            inimigo.x +
                inimigo.largura / 2 -
                19 +
                i * 22,

            inimigo.y - 17,

            16,
            8
        );
    }
}

// =====================================================
// DESENHAR MOEDAS SEM SPRITE
// =====================================================

function desenharMoedas() {
    for (const moeda of moedas) {
        const larguraVisual =
            Math.max(
                4,
                Math.abs(
                    Math.cos(moeda.angulo)
                ) *
                moeda.raio *
                2
            );

        ctx.fillStyle = "#ffd52a";

        ctx.beginPath();

        ctx.ellipse(
            moeda.x,
            moeda.y,

            larguraVisual / 2,
            moeda.raio,

            0,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.strokeStyle = "#a96800";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = "#fff2a0";

        ctx.fillRect(
            moeda.x -
                larguraVisual * 0.12,

            moeda.y -
                moeda.raio * 0.55,

            Math.max(
                2,
                larguraVisual * 0.2
            ),

            moeda.raio * 1.1
        );
    }
}

// =====================================================
// PARTÍCULAS
// =====================================================

function desenharParticulas() {
    for (const particula of particulas) {
        ctx.globalAlpha =
            Math.min(
                1,
                particula.vida / 15
            );

        ctx.fillStyle = particula.cor;

        ctx.fillRect(
            particula.x,
            particula.y,
            particula.tamanho,
            particula.tamanho
        );
    }

    ctx.globalAlpha = 1;
}

// =====================================================
// INTERFACE
// =====================================================

function desenharPainel() {
    ctx.fillStyle =
        "rgba(255,255,255,0.87)";

    ctx.fillRect(
        14,
        14,
        520,
        54
    );

    ctx.strokeStyle = "#17324d";
    ctx.lineWidth = 3;

    ctx.strokeRect(
        14,
        14,
        520,
        54
    );

    ctx.fillStyle = "#17283b";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "bold 16px Arial";

    ctx.fillText(
        "Pontos: " +
        Math.floor(pontos),
        28,
        41
    );

    ctx.fillText(
        "Moedas: " +
        moedasColetadas,
        145,
        41
    );

    ctx.fillText(
        "Derrotados: " +
        derrotados,
        260,
        41
    );

    ctx.fillText(
        "Saltos: " +
        (3 - jogador.saltosUsados),
        400,
        41
    );
}

// =====================================================
// MENU
// =====================================================

function desenharMenu() {
    ctx.fillStyle =
        "rgba(255,255,255,0.92)";

    ctx.fillRect(
        175,
        50,
        canvas.width - 350,
        310
    );

    ctx.strokeStyle = "#132c43";
    ctx.lineWidth = 5;

    ctx.strokeRect(
        175,
        50,
        canvas.width - 350,
        310
    );

    ctx.textAlign = "center";

    ctx.fillStyle = "#1670bd";
    ctx.font = "bold 44px Arial";

    ctx.fillText(
        "TRIANGLE RUN",
        canvas.width / 2,
        105
    );

    ctx.fillStyle = "#253a4d";
    ctx.font = "18px Arial";

    ctx.fillText(
        "Espaço ou ↑: pular",
        canvas.width / 2,
        148
    );

    ctx.fillText(
        "Aperte até 3 vezes para salto triplo",
        canvas.width / 2,
        178
    );

    ctx.fillText(
        "X ou ↓: atacar",
        canvas.width / 2,
        208
    );

    ctx.font = "15px Arial";

    ctx.fillText(
        "Verde: 1 golpe • Mexicano: 2 golpes",
        canvas.width / 2,
        244
    );

    ctx.fillText(
        "Laranja: pule por cima",
        canvas.width / 2,
        270
    );

    ctx.fillStyle = "#1769ba";

    ctx.fillRect(
        canvas.width / 2 - 110,
        294,
        220,
        50
    );

    ctx.fillStyle = "white";
    ctx.font = "bold 21px Arial";

    ctx.fillText(
        "JOGAR",
        canvas.width / 2,
        327
    );
}

// =====================================================
// GAME OVER
// =====================================================

function desenharGameOver() {
    ctx.fillStyle =
        "rgba(8,18,30,0.78)";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.fillStyle = "white";
    ctx.textAlign = "center";

    ctx.font = "bold 48px Arial";

    ctx.fillText(
        "GAME OVER",
        canvas.width / 2,
        105
    );

    ctx.font = "22px Arial";

    ctx.fillText(
        "Pontos: " +
        Math.floor(pontos),
        canvas.width / 2,
        160
    );

    ctx.fillText(
        "Moedas: " +
        moedasColetadas,
        canvas.width / 2,
        194
    );

    ctx.fillText(
        "Derrotados: " +
        derrotados,
        canvas.width / 2,
        228
    );

    ctx.fillText(
        "Recorde: " +
        recorde,
        canvas.width / 2,
        262
    );

    ctx.fillStyle = "#1769ba";

    ctx.fillRect(
        canvas.width / 2 - 145,
        290,
        290,
        58
    );

    ctx.fillStyle = "white";
    ctx.font = "bold 20px Arial";

    ctx.fillText(
        "JOGAR NOVAMENTE",
        canvas.width / 2,
        327
    );
}

// =====================================================
// DESENHAR
// =====================================================

function desenhar() {
    desenharFundo();
    desenharMoedas();
    desenharChao();
    desenharInimigos();
    desenharJogador();
    desenharParticulas();

    if (estadoAtual === ESTADO.JOGANDO) {
        desenharPainel();
    }

    if (estadoAtual === ESTADO.MENU) {
        desenharMenu();
    }

    if (estadoAtual === ESTADO.GAME_OVER) {
        desenharGameOver();
    }
}

// =====================================================
// LOOP
// =====================================================

function loopDoJogo() {
    atualizar();
    desenhar();

    requestAnimationFrame(loopDoJogo);
}

spriteSheet.onload = function () {
    loopDoJogo();
};

spriteSheet.onerror = function () {
    console.error(
        "Não foi possível carregar: " +
        spriteSheet.src
    );
};
