import * as rand from '../rand.js';
import { INSTRUCTION_TYPE } from './assembly.js';
import Register from './tomasulo/register.js';
import State from './tomasulo/state.js';

export function simulate(instructions) {
    // Os valores dos registradores e das posições de memória que serão lidos são inicializados automaticamente
    let registers = {};
    let memory = {};
    for (let instruction of instructions) {
        // Para os registradores que serão lidos, são gerados valores de exemplo para a simulação
        for (let name of instruction.src_registers) {
            if (name in registers)
                continue;

            let register = new Register();
            register.setValue(rand.instructionValue(name, instruction.name, instruction.type));
            registers[name] = register;
        }

        if (instruction.type === INSTRUCTION_TYPE.LOAD) {
            const addr = registers[instruction.src[0]].getValue() + instruction.src[1];
            memory[addr] = rand.instructionValue(instruction.dest, instruction.name, instruction.type);
        }

        // Os demais registradores são inicializados vazios
        for (let name of instruction.dest_registers)
            if (!(name in registers))
                registers[name] = new Register();
    }

    // Constrói objeto de programa, com instruções em sua ordem de execução
    let program = {};
    for (let i = 0; i < instructions.length; i++)
        program[i] = instructions[i];

    // Calcula todos os estados da simulação.
    const memoryAddr = new Set();
    const states = [new State(program, registers, memory)];
    const interStates = [[]];
    for (let i = 0; i < 100; i++) {
        const nextState = states[i].clone();
        const simResult = nextState.next_cycle();
        states.push(nextState);
        interStates.push(simResult[1]);

        for (let addr in nextState.memory)
            memoryAddr.add(addr);

        if (!simResult[0])
            break;
    }
    for (let state of states)
        for (let addr of memoryAddr)
            if (!(addr in state.memory))
                state.memory[addr] = null;

    return [states, interStates];

    /* let wsl = 0;
    for (let instruction of instructions) {
        if (instruction.line.length > wsl)
            wsl = instruction.line.length;
    }

    let str = '';
    for (let i = 0; i < states.length; i++) {
        const state = states[i];
        str += state.inspect();
        str += '— — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — — —\n';

        let actions = ''.padEnd(wsl);
        for (let j = 0; j < states.length; j++)
            actions += `\t${j}`;
        actions += '\n';
        for (let j = 0; j < instructions.length; j++) {
            const instruction = instructions[j];
            actions += `${instruction.line}:`.padEnd(wsl);
            for (let k = 0; k <= i; k++) {
                const action = states[k].program_actions[j];
                actions += `\t${action === null ? '-' : action}`;
            }
            actions += '\n';
        }
        str += actions;
        str += '⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻\n';
    }
    return str; */
}
