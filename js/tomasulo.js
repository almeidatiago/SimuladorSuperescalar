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
        this.functional_wait = functional_wait;
        this.reset();
    }

    /**
     * Retorna as propriedades desta estação para seus valores iniciais.
     */
    reset() {
        this.program_order = null;
        this.functional_unit_step = 0;
        this.result = null;

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
     * Sobrescreve o valor de Vj e Qj.
     * @param {number} value 
     */
    set_j_value(value) {
        this.vj = value;
        this.qj = null;
    }

    /**
     * Sobrescreve o valor de Vk e Qk.
     * @param {number} value 
     */
    set_k_value(value) {
        this.vk = value;
        this.qk = null;
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
        let a = '-';
        if (this.a)
            a = this.a.length > 1 ? `${this.a[0]} (${this.a[2]}+${this.a[1]})` : this.a[0];
        return `${this.busy ? 'Sim' : 'Não'}\t${this.op ? this.op : '-'}\t${this.vj ? this.vj : '-'}\t${this.vk ? this.vk : '-'}\t${this.qj ? this.qj : '-'}\t${this.qk ? this.qk : '-'}\t${a}`;
    }

    /**
     * Efetua uma cópia profunda deste objeto.
     * @returns {ReservationStation}
     */
    clone() {
        let c = new ReservationStation(this.operations, this.functional_wait);
        c.program_order = this.program_order;
        c.functional_unit_step = this.functional_unit_step;
        c.result = this.result;
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
     * @param {Object.<string, number>} memory Memória em seu estado inicial
     */
    constructor(program, registers, memory) {
        this.program = program;
        this.registers = registers;
        this.memory = memory;

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

        str += 'Memória:\n';
        if (Object.keys(this.memory).length > 0) {
            for (let addr in this.memory)
                str += `    ${addr} = ${this.memory[addr]}\n`;
        }

        str += '\n';
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

        let m = {};
        for (let addr in this.memory)
            m[addr] = this.memory[addr];

        let c = new State(this.program, r, m);
        c.cycle = this.cycle;
        c.instruction_queue = this.instruction_queue;
        c.reservation_stations = rs;

        return c;
    }

    next_cycle() {
        this.cycle++;

        // Calcula as estações de reserva que serão utilizadas antes de efetuar os passos de processamento:
        // Fase 1
        const s1_inst = this.program[this.instruction_queue];
        const s1_rs = this.station_for_stage_one(s1_inst);
        // Fase 2
        const s2op_rs = this.stations_for_stage_two_operations();
        const s2s1_rs = this.station_for_stage_two_step_one();
        const s2s2_rs = this.stations_for_stage_two_step_two();
        // Fase 3
        const s3_rs = this.station_for_stage_three();
        const s3store_rs = this.stations_for_stage_three_store();

        if (s1_rs === null && s2op_rs.length == 0 && s2s1_rs === null && s2s2_rs.length === 0 && s3_rs === null && s3store_rs.length === 0)
            return false;

        // 1 - Issue
        if (s1_rs !== null) {
            // Estação de reserva livre, issue continua...
            const station = this.reservation_stations[s1_rs];
            station.op = s1_inst.name;
            station.program_order = this.instruction_queue;
            station.functional_unit_step = station.functional_wait;

            this.program_actions[this.instruction_queue] = 'Issue';
            this.instruction_queue++;

            // Arithmetic operation
            if (s1_inst.type >= INSTRUCTION_TYPE.ADD) {
                station.busy = true;
                station.set_j_from_register(this.registers[s1_inst.lhs]);
                station.set_k_from_register(this.registers[s1_inst.rhs]);
                this.registers[s1_inst.dest].wait_for_station(s1_rs);
            }

            // Load or store
            if (s1_inst.type === INSTRUCTION_TYPE.LOAD || s1_inst.type === INSTRUCTION_TYPE.STORE) {
                const addr_reg = s1_inst.type === INSTRUCTION_TYPE.LOAD ? s1_inst.src[0] : s1_inst.dest[0];
                const addr_off = s1_inst.type === INSTRUCTION_TYPE.LOAD ? s1_inst.src[1] : s1_inst.dest[1];

                station.busy = true;
                station.set_j_from_register(this.registers[addr_reg]);
                station.a = [addr_off];
            }

            // Load only
            if (s1_inst.type === INSTRUCTION_TYPE.LOAD)
                this.registers[s1_inst.dest].wait_for_station(s1_rs);

            // Store only
            if (s1_inst.type === INSTRUCTION_TYPE.STORE)
                station.set_k_from_register(this.registers[s1_inst.src]);
        } else if (s1_inst !== null && s1_inst !== undefined) {
            console.log('stall'); // TODO descrição dos passos individuais em cada estágio
        }

        // 2 - Execute

        // Arithmetic operation
        for (let name of s2op_rs) {
            const station = this.reservation_stations[name];
            station.functional_unit_step--;

            this.program_actions[station.program_order] = 'Exec';
            if (station.functional_unit_step == 0) {
                switch (this.program[station.program_order].type) {
                    case INSTRUCTION_TYPE.ADD:
                        station.result = station.vj + station.vk;
                        break;
                    case INSTRUCTION_TYPE.SUBTRACT:
                        station.result = station.vj - station.vk;
                        break;
                    case INSTRUCTION_TYPE.MULTIPLY:
                        station.result = station.vj * station.vk;
                        break;
                    case INSTRUCTION_TYPE.DIVIDE:
                        station.result = station.vj / station.vk;
                        break;
                }
            }
        }

        // Load/store step 1
        if (s2s1_rs !== null) {
            const station = this.reservation_stations[s2s1_rs];
            // if (this.program[station.program_order].type === INSTRUCTION_TYPE.STORE)
            //     station.result = station.a + station.vj;
            // station.a = `${station.result} (${station.a} + ${station.vj})`;
            station.a = [station.a[0] + station.vj, station.a[0], station.vj];
            station.functional_unit_step--;

            this.program_actions[station.program_order] = 'Exec';
        }

        // Load step 2
        for (let name of s2s2_rs) {
            const station = this.reservation_stations[name];
            station.functional_unit_step--;

            this.program_actions[station.program_order] = 'Exec';
            if (station.functional_unit_step == 0) {
                // const i = this.program[station.program_order];
                // station.result = this.memory[station.vj + i.src[1]];
                station.result = this.memory[station.a[0]];
            }
        }

        // 3 - Write

        // Arithmetic operation or load
        if (s3_rs !== null) {
            const station = this.reservation_stations[s3_rs];
            for (let name in this.registers) {
                if (this.registers[name].qi === s3_rs)
                    this.registers[name].write_value(station.result);
            }
            for (let name in this.reservation_stations) {
                if (this.reservation_stations[name].qj === s3_rs)
                    this.reservation_stations[name].set_j_value(station.result);
                if (this.reservation_stations[name].qk === s3_rs)
                    this.reservation_stations[name].set_k_value(station.result);
            }
            this.program_actions[station.program_order] = 'Write';
            station.reset();
        }

        // Store
        for (let name of s3store_rs) {
            const station = this.reservation_stations[name];
            station.functional_unit_step--;

            this.program_actions[station.program_order] = 'Write';
            if (station.functional_unit_step == 0) {
                // this.memory[station.result] = station.vk;
                this.memory[station.a[0]] = station.vk;
                station.reset();
            }
        }

        return true;
    }

    /**
     * Retorna as estações de reserva do tipo indicado que estão marcadas como 'busy'.
     * @param {string[]} type 
     */
    pending_stations(type) {
        let pending = [];
        for (let name in this.reservation_stations) {
            const rs = this.reservation_stations[name];
            if (rs.busy && this.program[rs.program_order].type === type)
                pending.push(rs.program_order);
        }
        return pending;
    }

    /**
     * Retorna a estação de reserva, caso exista, que esteja disponível para receber a instrução indicada para a fase
     * de 'Issue'.
     * @param {Instruction} instruction
     * @returns {null|string}
     */
    station_for_stage_one(instruction) {
        if (instruction === null || instruction === undefined)
            return null;
        for (let name in this.reservation_stations) {
            const rs = this.reservation_stations[name];
            if (!rs.busy && rs.operations.includes(instruction.type))
                return name;
        }
        return null;
    }

    /**
     * Retorna as estações de reserva, caso existam, que estejam disponíveis para a fase de 'Execute' para as
     * operações aritméticas.
     * @returns {string[]}
     */
    stations_for_stage_two_operations() {
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

    /**
     * Retorna a estação de reserva, caso exista, que esteja disponível para o passo 1 da fase de 'Execute' para as
     * operações de load/store. Estas operações são executadas desta maneira para impedir os hazards de leitura/escrita
     * em memória das operações que apontam para o mesmo endereço.
     * @returns {null|string}
     */
    station_for_stage_two_step_one() {
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
     * Retorna as estações de reserva, caso existam, que estejam disponíveis para o passo 2 da fase de 'Execute' para as
     * operações de load. Estas operações são executadas desta maneira para impedir os hazards de leitura/escrita em
     * memória das operações que apontam para o mesmo endereço.
     * @returns {string[]}
     */
    stations_for_stage_two_step_two() {
        let pending_stores = this.pending_stations(INSTRUCTION_TYPE.STORE);

        let stations = [];
        for (let name in this.reservation_stations) {
            const rs = this.reservation_stations[name];

            if (
                rs.busy &&
                this.program[rs.program_order].type === INSTRUCTION_TYPE.LOAD &&
                rs.functional_unit_step < rs.functional_wait &&
                rs.functional_unit_step > 0
            ) {
                const load_addr = this.program[rs.program_order].src;

                let has_dependency = false;
                for (let i of pending_stores) {
                    const store_addr = this.program[i].dest;
                    if (i < rs.program_order && load_addr[0] === store_addr[0] && load_addr[1] === store_addr[1])
                        has_dependency = true;
                }

                if (!has_dependency)
                    stations.push(name);
            }
        }
        return stations;
    }

    /**
     * Retorna as estações de reserva, caso existam, que estejam disponíveis para a fase de 'Write' para as operações
     * de store. Estas operações são executadas desta maneira para impedir os hazards de leitura/escrita em
     * memória das operações que apontam para o mesmo endereço.
     * @returns {string[]}
     */
    stations_for_stage_three_store() {
        let pending_loads = this.pending_stations(INSTRUCTION_TYPE.LOAD);
        let pending_stores = this.pending_stations(INSTRUCTION_TYPE.STORE);

        let stations = [];
        for (let name in this.reservation_stations) {
            const rs = this.reservation_stations[name];
            if (
                rs.busy &&
                this.program[rs.program_order].type === INSTRUCTION_TYPE.STORE &&
                rs.functional_unit_step < rs.functional_wait &&
                rs.is_k_ready()
            ) {
                const store_addr = this.program[rs.program_order].src;

                let has_dependency = false;
                for (let i of pending_loads) {
                    const addr = this.program[i].src;
                    if (i < rs.program_order && store_addr[0] === addr[0] && store_addr[1] === addr[1])
                        has_dependency = true;
                }
                for (let i of pending_stores) {
                    const addr = this.program[i].dest;
                    if (i < rs.program_order && store_addr[0] === addr[0] && store_addr[1] === addr[1])
                        has_dependency = true;
                }

                if (!has_dependency)
                    stations.push(name);
            }
        }
        return stations;
    }

    /**
     * Retorna a estação de reserva, caso exista, que esteja disponível para a fase de 'Execute'.
     * @returns {null|string}
     */
    station_for_stage_three() {
        for (let name in this.reservation_stations) {
            const rs = this.reservation_stations[name];
            if (
                rs.busy &&
                this.program[rs.program_order].type !== INSTRUCTION_TYPE.STORE &&
                rs.functional_unit_step <= 0
            )
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
    // Os valores dos registradores e das posições de memória que serão lidos são inicializados automaticamente
    let registers = {};
    let memory = {};
    for (let instruction of instructions) {
        // Para os registradores que serão lidos, são gerados valores de exemplo para a simulação
        for (let name of instruction.src_registers) {
            if (name in registers)
                continue;

            let register = new Register();
            register.write_value(rand.instructionValue(name, instruction.name, instruction.type));
            registers[name] = register;

            if (instruction.type === INSTRUCTION_TYPE.LOAD) {
                const addr = registers[instruction.src[0]].value + instruction.src[1];
                memory[addr] = rand.instructionValue(instruction.dest, instruction.name, instruction.type);
            }
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
    let states = [new State(program, registers, memory)];
    for (let i = 0; i < 100; i++) {
        let next = states[i].clone();
        let changes = next.next_cycle();
        states.push(next);
        if (!changes)
            break;
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
}
