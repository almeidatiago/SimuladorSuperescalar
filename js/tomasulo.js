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
     * @param {number} functional_wait Número de ciclos que a unidade funcional desta estação deve levar para executar.
     */
    constructor(operations, functional_wait) {
        this.operations = operations;
        this.program_order = null;
        this.functional_wait = functional_wait;
        this.functional_unit_step = 0;

        this.op = null; // Operação a ser executada nos operandos
        this.vj = null; // Valor do primeiro operando
        this.vk = null; // Valor do segundo operando
        this.qj = null; // Nome da estação de reserva que produzirá o valor Vj
        this.qk = null; // Nome da estação de reserva que produzirá o valor Vk
        this.a = null; // Endereço utilizado pelas instruções de load/store
        this.busy = false; // Estado da estação de reserva
    }

    /**
     * Verdadeiro se o valor esperado por Qj já foi produzido e armazenado em Vj.
     * @returns {boolean}
     */
    is_j_ready() {
        return this.qj === null && this.vj !== null;
    }

    /**
     * Verdadeiro se o valor esperado por Qk já foi produzido e armazenado em Vk.
     * @returns {boolean}
     */
    is_k_ready() {
        return this.qk === null && this.vk !== null;
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
        let c = new ReservationStation(this.operations, this.functional_wait);
        c.program_order = this.program_order;
        c.functional_unit_step = this.functional_unit_step;
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
            'Load1': new ReservationStation([INSTRUCTION_TYPE.LOAD, INSTRUCTION_TYPE.STORE], 2 + 1),
            'Load2': new ReservationStation([INSTRUCTION_TYPE.LOAD, INSTRUCTION_TYPE.STORE], 2 + 1),
            'Load3': new ReservationStation([INSTRUCTION_TYPE.LOAD, INSTRUCTION_TYPE.STORE], 2 + 1),
            'Add1': new ReservationStation([INSTRUCTION_TYPE.ADD, INSTRUCTION_TYPE.SUBTRACT], 2),
            'Add2': new ReservationStation([INSTRUCTION_TYPE.ADD, INSTRUCTION_TYPE.SUBTRACT], 2),
            'Add3': new ReservationStation([INSTRUCTION_TYPE.ADD, INSTRUCTION_TYPE.SUBTRACT], 2),
            'Mul1': new ReservationStation([INSTRUCTION_TYPE.MULTIPLY, INSTRUCTION_TYPE.DIVIDE], 5),
            'Mul2': new ReservationStation([INSTRUCTION_TYPE.MULTIPLY, INSTRUCTION_TYPE.DIVIDE], 5),
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

        this.program_actions = {};
        for (let i in this.program)
            this.program_actions[i] = null;
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

        // Fase 2
        const ls_step_one = this.next_load_store_step_one();
        const ls_step_two = this.next_load_store_step_two();
        const op_exec = this.next_operation_exec();

        // 1 - Issue
        const next_inst = this.program[this.instruction_queue];
        const rs = this.is_station_free(next_inst);
        if (rs !== null) {
            // Estação de reserva livre, issue continua...
            const station = this.reservation_stations[rs];
            station.op = next_inst.name;
            station.program_order = this.instruction_queue;
            station.functional_unit_step = station.functional_wait;

            this.program_actions[this.instruction_queue] = 'Issue';
            this.instruction_queue++;

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
                station.a = parseInt(addr_off);
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
        
        // Arithmetic operation
        for (let name of op_exec) {
            const station = this.reservation_stations[name];
            // console.log(`${this.cycle} ${name}`); TODO execute
        }

        // Load/store step 1
        if (ls_step_one !== null) {
            const station = this.reservation_stations[ls_step_one];
            station.a = `${station.a} + ${station.vj}`;
            station.functional_unit_step--;

            this.program_actions[station.program_order] = 'Exec';
        }

        // Load/store step 2
        for (let name of ls_step_two) {
            const station = this.reservation_stations[name];
            // console.log(`${this.cycle} ${name}`); TODO write
            station.functional_unit_step--;

            this.program_actions[station.program_order] = 'Exec';
        }

        // 3 - Write
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

    /**
     * A fase 'Execute' é feita de maneira diferente para as operações de LOAD e STORE, para manter a ordem de programa
     * durante a escrita na memória. Este método retorna o id da estação de reserva, caso exista, da próxima unidade de
     * load/store a ter o passo 1 executado.
     * @returns {null|string}
     */
    next_load_store_step_one() {
        let cur_name = null;
        let cur_program_order = Infinity;
        for (let name in this.reservation_stations) {
            const rs = this.reservation_stations[name];
            if (
                rs.busy &&
                (rs.operations.includes(INSTRUCTION_TYPE.LOAD) || rs.operations.includes(INSTRUCTION_TYPE.STORE)) &&
                rs.functional_unit_step === rs.functional_wait &&
                rs.is_j_ready() &&
                rs.program_order < cur_program_order
            ) {
                cur_name = name;
                cur_program_order = rs.program_order;
            }
        }
        return cur_name;
    }

    /**
     * As demais operações de LOAD e STORE, durante a fase 'Execute', podem continuar a sua execução durante o passo 2.
     * @returns {string[]}
     */
    next_load_store_step_two() {
        let stations = [];
        for (let name in this.reservation_stations) {
            const rs = this.reservation_stations[name];
            if (
                rs.busy &&
                (rs.operations.includes(INSTRUCTION_TYPE.LOAD) || rs.operations.includes(INSTRUCTION_TYPE.STORE)) &&
                rs.functional_unit_step < rs.functional_wait &&
                rs.functional_unit_step > 0
            ) {
                stations.push(name);
            }
        }
        return stations;
    }


    /**
     * Encontra as estações de reservas de operações aritméticas que estão prontas para começar/prosseguir a fase de
     * 'Execute'.
     * @returns {string[]}
     */
    next_operation_exec() {
        let stations = [];
        for (let name in this.reservation_stations) {
            const rs = this.reservation_stations[name];
            if (
                rs.busy &&
                (
                    rs.operations.includes(INSTRUCTION_TYPE.ADD) || rs.operations.includes(INSTRUCTION_TYPE.SUBTRACT) ||
                    rs.operations.includes(INSTRUCTION_TYPE.MULTIPLY) || rs.operations.includes(INSTRUCTION_TYPE.DIVIDE)
                ) &&
                rs.is_j_ready() &&
                rs.is_k_ready() &&
                rs.functional_unit_step <= rs.functional_wait &&
                rs.functional_unit_step > 0
            ) {
                stations.push(name);
            }
        }
        return stations;
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
            register.write_value(rand.instructionValue(name, instruction.name, instruction.type));
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
    for (let i = 0; i < 5; i++) {
        let next = states[i].clone();
        next.next_cycle();
        states.push(next);
    }

    let wsl = 0;
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
    return str;

    // return states.map(s => s.inspect()).join('⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻⸻\n');
    // return states.map(s => s.inspect()).join(' —  —  —  —  —  —  —  —  —  —  —  —  —  —  —  —  —  —  —  —  —  —  —  —  —  —  —  —  —  — \n');
}
