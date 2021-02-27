/**
 * Efetua o controle de ciclos/passos da visualização.
 */
export class Controller extends EventTarget {

    /**
     * @param {string} mainId Id do elemento principal.
     * @param {string} counterId Id do elemento de progresso.
     * @param {string} msgId Id do elemento de mensagem.
     * @param {string[]} skipIds Id dos elementos de voltar e avançar ciclo.
     * @param {string[]} stepIds Id dos elementos de voltar e avançar passo.
     */
    constructor(mainId, counterId, msgId, skipIds, stepIds) {
        super();
        this.curState = 0;
        this.curInterState = 0;
        this.numStates = 0;
        this.numInterStates = 0;
        this.main = document.getElementById(mainId);
        this.counter = document.getElementById(counterId);
        this.msg = document.getElementById(msgId);
        this.skipBack = document.getElementById(skipIds[0]);
        this.skipFwd = document.getElementById(skipIds[1]);
        this.stepBack = document.getElementById(stepIds[0]);
        this.stepFwd = document.getElementById(stepIds[1]);

        // Define eventos
        this.updateEvent = new Event('update');

        // Recebe eventos de controle
        document.addEventListener('keydown', (e) => {
            const targetType = e.target.tagName.toLowerCase();
            if (targetType === 'textarea')
                return;

            if (e.ctrlKey) {
                if (e.key === 'ArrowLeft')
                    this.goBackCycle();
                else if (e.key === 'ArrowRight')
                    this.goFwdCycle();
            } else {
                if (e.key === 'ArrowLeft')
                    this.goBackStep();
                else if (e.key === 'ArrowRight')
                    this.goFwdStep();
            }
        });
        this.skipBack.addEventListener('click', this.goBackCycle.bind(this));
        this.skipFwd.addEventListener('click', this.goFwdCycle.bind(this));
        this.stepBack.addEventListener('click', this.goBackStep.bind(this));
        this.stepFwd.addEventListener('click', this.goFwdStep.bind(this));
    }

    /**
     * Retrocede a visualização em um ciclo de clock.
     */
    goBackCycle() {
        if (this.curState <= 0)
            return;

        this.curState--;
        this.curInterState = this.numInterStates[this.curState];
        this.redraw();
        this.dispatchEvent(this.updateEvent);
    }

    /**
     * Avança a visualização em um ciclo de clock.
     */
    goFwdCycle() {
        if (this.curState >= this.numStates - 1)
            return;

        this.curState++;
        this.curInterState = this.numInterStates[this.curState];
        this.redraw();
        this.dispatchEvent(this.updateEvent);
    }

    /**
     * Retrocede a visualização em um passo intermediário.
     */
    goBackStep() {
        if (this.curInterState <= 0) {
            this.goBackCycle();
            return;
        }

        this.curInterState--;
        this.redraw();
        this.dispatchEvent(this.updateEvent);
    }

    /**
     * Avança a visualização em um passo intermediário.
     */
    goFwdStep() {
        if (this.curInterState >= this.numInterStates[this.curState]) {
            if (this.curState >= this.numStates - 1)
                return;

            this.curState++;
            this.curInterState = 0;
        } else {
            this.curInterState++;
        }
        this.redraw();
        this.dispatchEvent(this.updateEvent);
    }

    /**
     * Abre a janela de controle.
     */
    show() {
        const classes = this.main.className.split(' ');
        if (classes.indexOf('visible') === -1)
            this.main.className += ' visible';
    }

    /**
     * Oculta a janela de controle.
     */
    hide() {
        this.counter.textContent = '';
        this.main.className = this.main.className.replace(/\bvisible\b/g, '');
    }

    /**
     * Atualiza dados sobre o controle da visualização.
     * @param {number} curState Ciclo de clock atual.
     * @param {number} curInterState Passo intermediário atual deste ciclo de clock.
     * @param {number} numStates Total de ciclos de clock.
     * @param {number} numInterStates Total de passos intermediários para cada ciclo de clock.
     * @param {string} msg Mensagem para exibir ao lado do controle.
     */
    updateInfo(curState, curInterState, numStates, numInterStates, msg = '') {
        this.curState = curState;
        this.curInterState = curInterState;
        this.numStates = numStates;
        this.numInterStates = numInterStates;

        let msgHtml = msg;
        msgHtml = msgHtml.replace(/\*\*([^*]+)\*\*/g, '<span class="bold">$1</span>');
        msgHtml = msgHtml.replace(/\/\/([^/]+)\/\//g, '<span class="italic">$1</span>');
        msgHtml = msgHtml.replace(/`([^`]+)`/g, '<span class="mono">$1</span>');
        this.msg.innerHTML = msgHtml;

        this.redraw();
    }

    /**
     * Atualiza os componentes visuais do controle.
     */
    redraw() {
        // Desativa os botôes de voltar, caso necessário
        if (this.curState <= 0) {
            this.skipBack.className = this.skipBack.className.replace(/\bactive\b/g, '');
            this.stepBack.className = this.stepBack.className.replace(/\bactive\b/g, '');
        } else {
            if (this.skipBack.className.split(' ').indexOf('active') === -1)
                this.skipBack.className += ' active';
            if (this.stepBack.className.split(' ').indexOf('active') === -1)
                this.stepBack.className += ' active';
        }

        // Desativa os botôes de avançar, caso necessário
        if (this.curState >= this.numStates - 1) {
            this.skipFwd.className = this.skipFwd.className.replace(/\bactive\b/g, '');
            this.stepFwd.className = this.stepFwd.className.replace(/\bactive\b/g, '');
        } else {
            if (this.skipFwd.className.split(' ').indexOf('active') === -1)
                this.skipFwd.className += ' active';
            if (this.stepFwd.className.split(' ').indexOf('active') === -1)
                this.stepFwd.className += ' active';
        }

        // Desativa o objeto de mensagem
        if (this.msg.textContent.length <= 0)
            this.msg.className = this.msg.className.replace(/\bactive\b/g, '');
        else if (this.msg.className.split(' ').indexOf('active') === -1)
            this.msg.className += ' active';
            
        this.counter.textContent = `${this.curState} / ${this.numStates - 1}`;
    }

}
