import * as assembly from '../simulation/assembly.js';
import * as tomasulo from '../simulation/tomasulo.js';

/**
 * Gerencia a lógica para abrir/fechar janelas modais.
 */
export class Modal {

    /**
     * @param {string} modalId Id do elemento de modal.
     * @param {string[]} openWith Ids dos elementos que abrem a janela.
     * @param {string} closeWith Ids dos elementos que fecham a janela.
     */
    constructor(modalId, openWith = [], closeWith = []) {
        this.modal = document.getElementById(modalId);

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal)
                this.hide();
        });
        for (let elemId of openWith)
            document.getElementById(elemId).addEventListener('click', this.show.bind(this));
        for (let elemId of closeWith)
            document.getElementById(elemId).addEventListener('click', this.hide.bind(this));
    }

    /**
     * Abre a janela modal.
     */
    show() {
        const classes = this.modal.className.split(' ');
        if (classes.indexOf('visible') === -1)
            this.modal.className += ' visible';
    }

    /**
     * Fecha a janela modal.
     */
    hide() {
        this.modal.className = this.modal.className.replace(/\bvisible\b/g, '');
    }

}

/**
 * Gerencia a lógica para a janela de Nova Simulação.
 */
export class ModalNova extends Modal {

    constructor(tabManager, modalId, openWith = [], closeWith = [], templateSelectId, codeTextareaId, submitId) {
        closeWith.push(submitId);
        super(modalId, openWith, closeWith);
        this.tabManager = tabManager;
        this.templateSelect = document.getElementById(templateSelectId);
        this.codeTextarea = document.getElementById(codeTextareaId);
        this.submit = document.getElementById(submitId);
        
        this.loadTemplate(this.templateSelect.value);

        // Prepara eventos da interface
        this.submit.addEventListener('click', this.submitCode.bind(this));
        this.codeTextarea.addEventListener('input', () => {
            this.templateSelect.selectedIndex = 0;
        });
        this.templateSelect.addEventListener('change', () => {
            if (this.templateSelect.value.length !== 0)
                this.loadTemplate(this.templateSelect.value);
        });
    }

    /**
     * Carrega um template para a janela de código.
     * @param {string} templateName 
     */
    loadTemplate(templateName) {
        switch (templateName) {
            case 'raw':
                this.codeTextarea.value = 'fmul.s f4, f1, f2\nfadd.s f5, f1, f4';
                break;
            case 'war':
                this.codeTextarea.value = 'fmul.s f4, f1, f5\nfadd.s f5, f1, f2';
                break;
            case 'waw':
                this.codeTextarea.value = 'fmul.s f6, f1, f2\nfadd.s f6, f3, f4';
                break;
            case 'ooo':
                this.codeTextarea.value = 'flw f0, 32(a0)\nflw f1, 64(a1)\nfmul.s f2, f0, f1\nfsub.s f3, f0, f1\nfdiv.s f3, f2, f3\nfadd.s f1, f0, f1';
                break;
            case 'loop':
                this.codeTextarea.value = '# a0 = 0\n# a1 = 96\n# f1 = 2.0\nloop:\n    flw     f0, 0(a0)\n    fmul.s  f2, f0, f1\n    fsw     f2, 0(a0)\n    addi    a0, a0, 32\n    blt     a0, a1, loop\nend:';
                break;
        }
    }

    /**
     * Processa, simula, e gera a visualização para um novo código.
     */
    submitCode() {
        let name = null;
        if (this.templateSelect.selectedIndex !== 0)
            name = this.templateSelect.options[this.templateSelect.selectedIndex].text;
        const code = this.codeTextarea.value;

        // Processa código em instruções
        const fragments = assembly.parse(code);
        if (fragments == null)
            return;

        // Efetua simulação do algoritmo de Tomasulo sobre o código processado
        const tomasuloSim = tomasulo.simulate(fragments);
        if (tomasuloSim[0].length !== tomasuloSim[1].length)
            return;

        // Gera nome para tab
        let i = 1;
        let baseName = name !== null ? name : `${fragments[0][0].line}`;
        let tabName = baseName;
        while (this.tabManager.contains(tabName)) {
            i++;
            tabName = `${baseName} (${i})`;
        }

        // Calcula o número de passos intermediários para cada ciclo de clock
        const numInterStates = [];
        for (let i = 0; i < tomasuloSim[0].length; i++)
            numInterStates.push(tomasuloSim[1][i] === null ? 0 : tomasuloSim[1][i].length);

        // Adiciona tabs a lista
        this.tabManager.add(tabName, {
            type: 'tomasulo',
            curState: 0,
            curInterState: 0,
            states: tomasuloSim[0],
            interStates: tomasuloSim[1],
            numStates: tomasuloSim[0].length,
            numInterStates: numInterStates,
            instructions: fragments[0],
        });
    }

}
