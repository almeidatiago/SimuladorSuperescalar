# SimuladorSuperescalar

Este é um simulador didático de processadores de arquitetura superescalar, desenvolvido para o curso de **Ciência da Computação** da **Universidade Federal do Tocantins**.

### Funcionalidades

O simulador é capaz de simular a execução de um programa qualquer, fornecido em um subconjunto do código _assembly_ RISC-V, em um processador sob o modelo do [Algoritmo de Tomasulo](https://pt.wikipedia.org/wiki/Algoritmo_de_Tomasulo). A simulação pode, então, ser visualizada passo-a-passo nos diagramas lógicos do algoritmo, e na linha do tempo de execução.

O simulador pode ser acessado [neste endereço](https://hbertoduarte.github.io/SimuladorSuperescalar/).

## Como Utilizar

Para adicionar um novo programa, clique no botão **Nova Simulação** na barra superior da página, e insira o código do programa a ser simulado. Você pode também escolher um dos exemplos disponíveis no simulador.

O código fornecido deve ser em código _assembly_ RISC-V, do qual as seguintes instruções são suportadas:

-   **Integer**
    -   `li`
    -   `lb`, `lh`, `lw`, `ld`, `lq`, `lbu`, `lhu`, `lwu`, `ldu`
    -   `sb`, `sh`, `sw`, `sd`, `sq`
    -   `addi`, `addiw`, `addid`
    -   `add`, `addw`, `addd`
    -   `sub`, `subw`, `subd`
    -   `mul`, `mulw`, `muld`
    -   `div`, `divw`, `divd`
-   **Floating Point**
    -   `flw`, `fld`, `flq`
    -   `fsw`, `fsd`, `fsq`
    -   `fadd.s`, `fadd.d`, `fadd.q`
    -   `fsub.s`, `fsub.d`, `fsub.q`
    -   `fmul.s`, `fmul.d`, `fmul.q`
    -   `fdiv.s`, `fdiv.d`, `fdiv.q`
-   **Control Flow**
    -   `j`
    -   `beq`, `bne`, `blt`, `bge`, `bltu`, `bgeu`

Apesar de ambos números inteiros e números de ponto flutuante serem suportados, a simulação é efetuada em um modelo numérico abstrato, e todas as especificidades de cada instrução, como tamanho de palavra ou precisão numérica, são ignoradas.

No código também podem ser fornecidos os valores iniciais de cada registrador, em um comentário no formato `# nome = valor`. Como modelo desta funcionalidade, veja o exemplo _"Loop (Iterações simultâneas)"_ no simulador.

## Visualização

Após um novo programa ser adicionado, a visualização da execução será exibida em uma nova aba do simulador. A execução pode ser visualizada ciclo-a-ciclo, ou cada ciclo pode ser visualizado de forma segmentada nas etapas do Algoritmo de Tomasulo.

O controle da visualização pode ser feito pelo menu no canto inferior esquerdo, ou através dos atalhos:

-   `Ctrl` + `Seta Esquerda`: Retrocede a execução em um ciclo de clock.
-   `Seta Esquerda`: Retrocede a execução em um passo.
-   `Seta Direita`: Avança a execução em um passo.
-   `Ctrl` + `Seta Direita`: Avança a execução em um ciclo de clock.
