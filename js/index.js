import * as assembly from './assembly.js';
import * as tomasulo from './tomasulo/state.js';

document.getElementById('button').addEventListener('click', () => {
    const inst = assembly.parse(document.getElementById('textarea').value);
    document.getElementById('txt').innerHTML = inst.map((i) => {
        return `<tr><td> ${i.line}</td><td>&nbsp;</td><td>${i.inspect()}</td></tr>`;
    }).join('\n');
    
    tomasulo.simulate(inst);
});
