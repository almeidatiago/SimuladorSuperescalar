import { INSTRUCTION_TYPE } from '../simulation/assembly.js';

/**
 * Gerencia a tabela com a linha do tempo de execução.
 */
export class Timeline {

    /**
     * @param {string} tableId Id do elemento de tabela.
     */
    constructor(tableId) {
        this.table = document.getElementById(tableId);
        this.tableContainer = this.table.parentElement;

        this.pos = { top: 0, left: 0, x: 0, y: 0, moving: false };
        this.tableContainer.addEventListener('mousedown', (e) => {
            this.tableContainer.style.cursor = 'grabbing';
            this.pos = {
                left: this.tableContainer.scrollLeft,
                top: this.tableContainer.scrollTop,
                x: e.clientX,
                y: e.clientY,
                moving: true,
            };
        });
        this.tableContainer.addEventListener('mousemove', (e) => {
            if (!this.pos.moving)
                return;

            const dx = e.clientX - this.pos.x;
            const dy = e.clientY - this.pos.y;
            this.tableContainer.scrollTop = this.pos.top - dy;
            this.tableContainer.scrollLeft = this.pos.left - dx;
        });
        this.tableContainer.addEventListener('mouseup', () => {
            this.tableContainer.style.cursor = 'default';
            this.pos.moving = false;
        });
        this.tableContainer.addEventListener('mouseleave', () => {
            this.tableContainer.style.cursor = 'default';
            this.pos.moving = false;
        });
    }

    /**
     * Limpa a linha do tempo.
     */
    clear() {
        this.table.textContent = '';
    }

    /**
     * Renderiza a linha do tempo.
     * @param {*} instructions 
     * @param {*} states 
     * @param {number} curState 
     */
    update(instructions, states, curState, stateToVisualize) {
        // Gera cabeçalho da tabela
        const headerRow = document.createElement('tr');
        headerRow.appendChild(document.createElement('th'));
        for (let i = 0; i < states.length; i++) {
            const th = document.createElement('th');
            th.innerText = `${i}`;
            if (curState === i)
                th.className = 'cur';
            headerRow.appendChild(th);
        }
        this.table.appendChild(headerRow);

        // Gera linhas da tabela
        let targetTd = curState === 0 ? headerRow.firstChild : null;
        const program = states[states.length - 1].program;
        for (let execi = 0; execi < program.executionOrder.length; execi++) {
            const codei = program.executionOrder[execi];
            const inst = program.codeOrder[codei];
                
            const instRow = document.createElement('tr');
            if (inst.type === INSTRUCTION_TYPE.BRANCH)
                instRow.className += ' mark';
            let td = document.createElement('td');
            td.textContent = inst.line;
            instRow.appendChild(td);

            for (let j = 0; j < states.length; j++) {
                td = document.createElement('td');
                if (j < curState) {
                    const action = states[j].program_actions[execi] == null ? '' : states[j].program_actions[execi];
                    td.className = action.toLowerCase();
                    td.textContent = action;
                } else if (j === curState) {
                    const action = stateToVisualize.program_actions[execi] == null ? '' : stateToVisualize.program_actions[execi];
                    td.className = action.toLowerCase();
                    td.textContent = action;

                    if (action.length > 0)
                        targetTd = td;
                }
                instRow.appendChild(td);
            }
            this.table.appendChild(instRow);
        }

        if (targetTd != null)
            targetTd.scrollIntoView(false);
    }

}
