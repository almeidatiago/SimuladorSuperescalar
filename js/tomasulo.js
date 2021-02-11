// import * as assembly from '../assembly.js';
import * as rand from './rand.js';
import { INSTRUCTION_TYPE } from './assembly.js';

/** Registrador virtual. */
export class Register {

    constructor() {
        this.qi = null;
        this.value = null;
    }

    /**
     * Verifica se este registrador está a espera do valor de uma estação de reserva.
     * @returns {boolean}
     */
    busy() {
        return this.qi !== null;
    }

    /**
     * Sobrescreve o valor deste registrador, resetando a flag Qi caso esteja ativada.
     * @param {number} value
     */
    write_value(value) {
        this.qi = null;
        this.value = value;
    }

    /**
     * Define que o registrador receberá o valor a ser produzido por uma uma estação de reserva.
     * @param {string} name 
     */
    wait_for_station(name) {
        this.qi = name;
    }

    /**
     * Descreve o registrador.
     */
    inspect() {
        if (this.busy())
            return `[${this.qi}]`;
        if (this.value !== null)
            return `${this.value}`;
        return '-';
    }

    /**
     * Efetua uma cópia profunda deste objeto.
     * @returns {Register}
     */
    clone() {
        let c = new Register();
        c.qi = this.qi;
        c.value = this.value;
        return c;
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
     * Decide o valor de Vj e Qj de acordo com o estado do registrador indicado. Utilizado durante a fase 'Issue'.
     * @param {Register} register 
     */
    set_j_from_register(register) {
        if (register.busy()) {
            this.qj = register.qi;
        } else {
            this.vj = register.value;
            this.qj = null;
        }
    }

    /**
     * Decide o valor de Vk e Qk de acordo com o estado do registrador indicado. Utilizado durante a fase 'Issue'.
     * @param {Register} register 
     */
    set_k_from_register(register) {
        if (register.busy()) {
            this.qk = register.qi;
        } else {
            this.vk = register.value;
            this.qk = null;
        }
    }

    /**
     * Descreve a estação de reserva.
     */
    inspect() {
        return `${this.busy ? 'Sim' : 'Não'}\t${this.op ? this.op : '-'}\t${this.vj ? this.vj : '-'}\t${this.vk ? this.vk : '-'}\t${this.qj ? this.qj : '-'}\t${this.qk ? this.qk : '-'}\t${this.a ? this.a : '-'}`;
    }

    /**
     * Efetua uma cópia profunda deste objeto.
     * @returns {ReservationStation}
     */
    clone() {
        let c = new ReservationStation(this.operations);
        c.op = this.op;
        c.vj = this.vj;
        c.vk = this.vk;
        c.qj = this.qj;
        c.qk = this.qk;
        c.a = this.a;
        c.busy = this.busy;
        return c;
    }

}

/** Estado de processamento */
export class State {

    /**
     * @param {Object.<number, assembly.Instruction[]>} program Programa a ser executado
     * @param {Object.<string, Register>} registers Registradores em seu estado inicial
     */
    constructor(program, registers) {
        this.program = program;
        this.registers = registers;

        // Ciclo de clock que este estado representa
        this.cycle = 0;

        // Posição da 'cabeça' da fila de execução, em relação ao programa
        this.instruction_queue = 0;

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
        let str = `Clock: ${this.cycle}\nFila de instruções:\n`;
        for (let i = this.instruction_queue; i < Object.keys(this.program).length; i++)
            str += `    ${i}: ${this.program[i].line}\n`;

        str += 'Registradores:\n';
        for (let name of this.register_names)
            str += `    ${name} = ${this.registers[name].inspect()}\n`;

        str += 'Estações de reserva:\n         \tBusy \tOp. \tVj \tVk \tQj \tQk \tA\n';
        for (let name in this.reservation_stations)
            str += `    ${name}:\t${this.reservation_stations[name].inspect()}\n`;

        return str;
    }

    /**
     * Efetua uma cópia profunda deste objeto.
     * @returns {State}
     */
    clone() {
        let r = {};
        for (let name in this.registers)
            r[name] = this.registers[name].clone();

        let rs = {};
        for (let name in this.reservation_stations)
            rs[name] = this.reservation_stations[name].clone();

        let c = new State(this.program, r);
        c.cycle = this.cycle;
        c.instruction_queue = this.instruction_queue;
        c.reservation_stations = rs;

        return c;
    }

    next_cycle() {
        this.cycle++;

        // 1 - Issue
        const next_inst = this.program[this.instruction_queue];
        const rs = this.is_station_free(next_inst);
        if (rs !== null) {
            // Estação de reserva livre, issue continua...
            this.instruction_queue++;
            const station = this.reservation_stations[rs];
            station.op = next_inst.name;

            // Arithmetic operation
            if (next_inst.type >= INSTRUCTION_TYPE.ADD) {
                station.busy = true;
                station.set_j_from_register(this.registers[next_inst.lhs]);
                station.set_k_from_register(this.registers[next_inst.rhs]);
                this.registers[next_inst.dest].wait_for_station(rs);
            }

            // Load or store
            if (next_inst.type === INSTRUCTION_TYPE.LOAD || next_inst.type === INSTRUCTION_TYPE.STORE) {
                const addr_reg = next_inst.type === INSTRUCTION_TYPE.LOAD ? next_inst.src[0] : next_inst.dest[0];
                const addr_off = next_inst.type === INSTRUCTION_TYPE.LOAD ? next_inst.src[1] : next_inst.dest[1];

                station.busy = true;
                station.set_j_from_register(this.registers[addr_reg]);                
                station.a = addr_off;
            }

            // Load only
            if (next_inst.type === INSTRUCTION_TYPE.LOAD)
                this.registers[next_inst.dest].wait_for_station(rs);

            // Store only
            if (next_inst.type === INSTRUCTION_TYPE.STORE)
                station.set_k_from_register(this.registers[next_inst.src]);
        } else {
            console.log('stall'); // TODO descrição dos passos individuais em cada estágio
        }

        // 2 - Execute
    }

    /**
     * Verifica se há uma estação de reserva livre para receber esta instrução.
     * @param {assembly.Instruction} instruction 
     * @returns {null|string}
     */
    is_station_free(instruction) {
        for (let name in this.reservation_stations) {
            const rs = this.reservation_stations[name];
            if (!rs.busy && rs.operations.includes(instruction.type))
                return name;
        }
        return null;
    }

}

/**
 * 
 * @param {assembly.Instruction[]} instructions 
 */
export function simulate(instructions) {
    // Coleta os nomes dos registradores utilizados no programa, e os inicializa quando necessário
    let registers = {};
    for (let instruction of instructions) {
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

    // Constrói objeto de programa, com instruções em sua ordem de execução
    let program = {};
    for (let i = 0; i < instructions.length; i++)
        program[i] = instructions[i];

    // Cria o estado inicial do processamento.
    let states = [new State(program, registers)];
    for (let i = 0; i < 2; i++) {
        let next = states[i].clone();
        next.next_cycle();
        states.push(next);
    }
    
    return states.map(s => s.inspect()).join('⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻\n');
}
