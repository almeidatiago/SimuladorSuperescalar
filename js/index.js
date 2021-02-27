import * as visualization from './visualization.js';
import { Controller } from './components/controller.js';
import { ModalNova } from './components/modal.js';
import { TabManager } from './components/tab_manager.js';
import { Timeline } from './components/timeline.js';

const timeline = new Timeline('timeline');
const controller = new Controller('control', 'control-counter', 'control-msg', ['control-skip-back', 'control-skip-fwd'], ['control-step-back', 'control-step-fwd']);
const tabManager = new TabManager('tab-names', 'tab-filler');
const readme = document.getElementById('readme');

// Prepara janelas modais
new ModalNova(tabManager, 'md-novo', ['open-novo'], ['close-novo'], 'novo-template', 'novo-code', 'novo-submit');

// Limpa elementos de visualização quando uma aba é trocada/removida
tabManager.addEventListener('tab-unset', () => {
    visualization.clearRender();
    timeline.clear();
    controller.hide();
    readme.style.display = 'block';
});

// Renderiza e atualiza visualização quando uma aba é exibida/atualizada
tabManager.addEventListener('tab-set', () => {
    const tabContents = tabManager.currentContents();
    if (tabContents === null)
        return;

    const curState = tabContents.curState;
    const curInterState = tabContents.curInterState;
    const states = tabContents.states;
    const numInterStates = tabContents.numInterStates;

    // Separa o estado de ciclo ou passo a ser visualizado
    let stateToVisualize = states[curState];
    let messageToDisplay = '';
    if (numInterStates[curState] > 0 && curInterState < numInterStates[curState]) {
        const i = tabContents.interStates[curState];
        stateToVisualize = i[curInterState][1];
        messageToDisplay = i[curInterState][0];
    }

    // Atualiza visualização no canvas
    switch (tabContents.type) {
        case 'tomasulo':
            visualization.renderTomasuloState(stateToVisualize);
            break;
    }

    // Atualiza tabela
    timeline.update(tabContents.instructions, states, curState, stateToVisualize);

    // Atualiza controle da visualização
    controller.show();
    controller.updateInfo(curState, curInterState, tabContents.numStates, numInterStates, messageToDisplay);
    readme.style.display = 'none';
});

// Atualiza a visualização
controller.addEventListener('update', () => {
    tabManager.updateContents({ curState: controller.curState, curInterState: controller.curInterState });
});
