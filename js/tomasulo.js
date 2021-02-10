import * as rand from './rand.js';
import { INSTRUCTION_TYPE } from './assembly.js';

/** Registrador virtual. */
export class Register {

    constructor() {
        this.qi = null;
        this.value = null;
    }

    /**
     * Sobrescreve o valor deste registrador, resetando a flag Qi caso esteja ativada.
     * @param {number} value
     */
    write_value(value) {
        this.qi = null;
        this.value = value;
    }

}

/** Estação de reserva. */
export class ReservationStation {

    /**
     * @param {INSTRUCTION_TYPE[]} operations Tipos de instruções suportadas por esta estação.
     */
    constructor(operations) {
        this.operations = operations;

        this.op = null; // Operação a ser executada nos operandos
        this.vj = null; // Valor do primeiro operando
        this.vk = null; // Valor do segundo operando
        this.qj = null; // Nome da estação de reserva que produzirá o valor Vj
        this.qk = null; // Nome da estação de reserva que produzirá o valor Vk
        this.a = null; // Endereço utilizado pelas instruções de load/store
        this.busy = false; // Estado da estação de reserva
    }

    /**
     * Descreve a estação de reserva.
     */
    inspect() {
        return `${this.busy ? 'Sim' : 'Não'}\t${this.op ? this.op : '-'}\t${this.vj ? this.vj : '-'}\t${this.vk ? this.vk : '-'}\t${this.qj ? this.qj : '-'}\t${this.qk ? this.qk : '-'}\t${this.a ? this.a : '-'}`;
    }

}

//** Estado de processamento */
export class State {

    /**
     * @param {assembly.Instruction[]} program Instruções de execução
     * @param {Object.<string, Register>} registers Registradores em seu estado inicial
     */
    constructor(program, registers) {
        this.instruction_queue = program;
        this.registers = registers;

        this.reservation_stations = {
            'Load1': new ReservationStation([INSTRUCTION_TYPE.LOAD, INSTRUCTION_TYPE.STORE]),
            'Load2': new ReservationStation([INSTRUCTION_TYPE.LOAD, INSTRUCTION_TYPE.STORE]),
            'Load3': new ReservationStation([INSTRUCTION_TYPE.LOAD, INSTRUCTION_TYPE.STORE]),
            'Add1': new ReservationStation([INSTRUCTION_TYPE.ADD, INSTRUCTION_TYPE.SUBTRACT]),
            'Add2': new ReservationStation([INSTRUCTION_TYPE.ADD, INSTRUCTION_TYPE.SUBTRACT]),
            'Add3': new ReservationStation([INSTRUCTION_TYPE.ADD, INSTRUCTION_TYPE.SUBTRACT]),
            'Mul1': new ReservationStation([INSTRUCTION_TYPE.MULTIPLY, INSTRUCTION_TYPE.DIVIDE]),
            'Mul2': new ReservationStation([INSTRUCTION_TYPE.MULTIPLY, INSTRUCTION_TYPE.DIVIDE]),
        };

        // Nomes dos registradores, em ordem alfabética
        this.register_names = Object.keys(this.registers)
            .map(x => [x, x.replace(/\d/g, ''), x.replace(/\D/g, '')])
            .sort((a, b) => a[2] - b[2])
            .sort((a, b) => {
                if (a[1] < b[1])
                    return -1;
                else if (a[1] > b[1])
                    return 1;
                else
                    return 0;
            })
            .map(x => x[0]);
    }

    /**
     * Descreve o estado.
     */
    inspect() {
        let str = 'Fila de instruções:\n';
        for (let i = 0; i < this.instruction_queue.length; i++)
            str += `    ${i}: ${this.instruction_queue[i].line}\n`;

        str += 'Registradores:\n';
        for (let name of this.register_names) {
            let value = this.registers[name].value;
            if (value === null)
                value = '-';
            str += `    ${name} = ${value}\n`;
        }

        str += 'Estações de reserva:\n         \tBusy \tOp. \tVj \tVk \tQj \tQk \tA\n';
        for (let name in this.reservation_stations)
            str += `    ${name}:\t${this.reservation_stations[name].inspect()}\n`;

        return str;
    }

}

export function simulate(program) {
    // Coleta os nomes dos registradores utilizados no programa, e os inicializa quando necessário
    let registers = {};
    for (let instruction of program) {
        // Para os registradores que serão lidos, são gerados valores de exemplo para a simulação
        for (let name of instruction.src_registers) {
            if (name in registers)
                continue;

            let register = new Register();
            if (instruction.name[0] === 'f' && instruction.type != INSTRUCTION_TYPE.LOAD && instruction.type != INSTRUCTION_TYPE.STORE)
                register.write_value(rand.float(name));
            else
                register.write_value(rand.int(name));
            registers[name] = register;
        }

        // Os demais registradores são inicializados vazios
        for (let name of instruction.dest_registers)
            registers[name] = new Register();
    }

    // Cria o estado inicial do processamento.
    let state = new State(program, registers);
    console.log(state.inspect());
}
