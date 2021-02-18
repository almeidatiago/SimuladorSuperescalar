/**
 * Efetua o controle de ciclos/passos da visualização.
 */
export class Controller extends EventTarget {

    /**
     * @param {string} mainId Id do elemento principal.
     * @param {string} counterId Id do elemento de progresso.
     * @param {string[]} skipIds Id dos elementos de voltar e avançar ciclo.
     */
    constructor(mainId, counterId, skipIds) {
        super();
        this.cur = 0;
        this.max = 0;
        this.main = document.getElementById(mainId);
        this.counter = document.getElementById(counterId);
        this.skipBack = document.getElementById(skipIds[0]);
        this.skipFwd = document.getElementById(skipIds[1]);

        // Define eventos
        this.skipBackEvent = new Event('skip-back');
        this.skipFwdEvent = new Event('skip-forward');

        // Recebe eventos de controle
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft')
                this.goBackCycle();
            else if (e.key === 'ArrowRight')
                this.goFwdCycle();
        });
        this.skipBack.addEventListener('click', this.goBackCycle.bind(this));
        this.skipFwd.addEventListener('click', this.goFwdCycle.bind(this));
    }

    goBackCycle() {
        if (this.cur <= 0)
            return;

        this.update(this.cur - 1, this.max);
        this.dispatchEvent(this.skipBackEvent);
    }

    goFwdCycle() {
        if (this.cur >= this.max)
            return;

        this.update(this.cur + 1, this.max);
        this.dispatchEvent(this.skipFwdEvent);
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
     * Atualiza a informação de progresso.
     * @param {number} cur Ciclo atual.
     * @param {number} max Total de ciclos.
     */
    update(cur, max) {
        this.cur = cur;
        this.max = max;
        this.counter.textContent = `${cur} / ${max}`;

        if (this.cur <= 0)
            this.skipBack.className = this.skipBack.className.replace(/\bactive\b/g, '');
        else if (this.skipBack.className.split(' ').indexOf('active') === -1)
            this.skipBack.className += ' active';

        if (this.cur >= this.max)
            this.skipFwd.className = this.skipFwd.className.replace(/\bactive\b/g, '');
        else if (this.skipFwd.className.split(' ').indexOf('active') === -1)
            this.skipFwd.className += ' active';
    }

}
