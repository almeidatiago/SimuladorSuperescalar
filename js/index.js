import * as visualization from './visualization.js';
import { Controller } from './components/controller.js';
import { ModalNova } from './components/modal.js';
import { TabManager } from './components/tab_manager.js';
import { Timeline } from './components/timeline.js';

const timeline = new Timeline('timeline');
const controller = new Controller('control', 'control-counter', ['control-skip-back', 'control-skip-fwd']);
const tabManager = new TabManager('tab-names', 'tab-filler');

// Prepara janelas modais
new ModalNova(tabManager, 'md-novo', ['open-novo'], ['close-novo'], 'novo-template', 'novo-code', 'novo-submit');

// Limpa elementos de visualização quando uma aba é trocada/removida
tabManager.addEventListener('tab-unset', () => {
    visualization.clearRender();
    timeline.clear();
    controller.hide();
});

// Renderiza e atualiza visualização quando uma aba é exibida/atualizada
tabManager.addEventListener('tab-set', () => {
    const tabContents = tabManager.currentContents();
    if (tabContents === null)
        return;

    const curState = tabContents.curState;
    const states = tabContents.states;

    // Atualiza visualização no canvas
    switch (tabContents.type) {
        case 'tomasulo':
            visualization.renderTomasuloState(states[curState]);
            break;
    }

    // Atualiza tabela
    timeline.update(tabContents.instructions, states, curState);

    // Atualiza controle da visualização
    controller.show();
    controller.update(curState, states.length - 1);
});

// Retrocede a visualização em um ciclo
controller.addEventListener('skip-back', () => {
    tabManager.updateContents({ curState: controller.cur });
});

// Avança a visualização em um ciclo
controller.addEventListener('skip-forward', () => {
    tabManager.updateContents({ curState: controller.cur });
});
