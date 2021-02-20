/**
 * Gerencia a tabela com a linha do tempo de execução.
 */
export class Timeline {

    /**
     * @param {string} tableId Id do elemento de tabela.
     */
    constructor(tableId) {
        this.table = document.getElementById(tableId);
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
        for (let i = 0; i < instructions.length; i++) {
            const instRow = document.createElement('tr');
            let td = document.createElement('td');
            td.textContent = instructions[i].line;
            instRow.appendChild(td);
            for (let j = 0; j < states.length; j++) {
                td = document.createElement('td');
                if (j < curState) {
                    const action = states[j].program_actions[i] === null ? '' : states[j].program_actions[i];
                    td.className = action.toLowerCase();
                    td.textContent = action;
                } else if (j === curState) {
                    const action = stateToVisualize.program_actions[i] === null ? '' : stateToVisualize.program_actions[i];
                    td.className = action.toLowerCase();
                    td.textContent = action;
                }
                instRow.appendChild(td);
            }
            this.table.appendChild(instRow);
        }
    }

}
