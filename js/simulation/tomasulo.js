import * as rand from '../rand.js';
import { INSTRUCTION_TYPE, Program } from './assembly.js';
import Register from './tomasulo/register.js';
import State from './tomasulo/state.js';

export function simulate(fragments) {
    const instructions = fragments[0];
    const sections = fragments[1];
    const sectionOrder = fragments[2];
    const initialValues = fragments[3];

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

        if (instruction.type === INSTRUCTION_TYPE.LOAD && instruction.imm == undefined) {
            const addr = registers[instruction.src[0]].getValue() + instruction.src[1];
            memory[addr] = rand.instructionValue(instruction.dest, instruction.name, instruction.type);
        }

        // Os demais registradores são inicializados vazios
        for (let name of instruction.dest_registers)
            if (!(name in registers))
                registers[name] = new Register();
    }

    // Sobrescreve valores iniciais
    for (const init in initialValues) {
        registers[init].setValue(initialValues[init]);
    }

    // Constrói objeto de programa, com instruções em sua ordem de execução
    const program = new Program(instructions, sections, sectionOrder);

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
}
