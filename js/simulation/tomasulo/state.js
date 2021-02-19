import * as rand from '../../rand.js';
import { INSTRUCTION_TYPE } from '../assembly.js';
import ReservationStation from './reservation_station.js';

/** Estado de processamento */
export default class State {

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
            station.setupOperation(s1_inst.name, this.instruction_queue, s1_inst.type);

            this.program_actions[this.instruction_queue] = 'Issue';
            this.instruction_queue++;

            // Arithmetic operation
            if (s1_inst.type >= INSTRUCTION_TYPE.ADD) {
                station.setJFromRegister(this.registers[s1_inst.lhs]);
                station.setKFromRegister(this.registers[s1_inst.rhs]);
                this.registers[s1_inst.dest].waitForStation(s1_rs);
            }

            // Load or store
            if (s1_inst.type === INSTRUCTION_TYPE.LOAD || s1_inst.type === INSTRUCTION_TYPE.STORE) {
                const addr_reg = s1_inst.type === INSTRUCTION_TYPE.LOAD ? s1_inst.src[0] : s1_inst.dest[0];
                const addr_off = s1_inst.type === INSTRUCTION_TYPE.LOAD ? s1_inst.src[1] : s1_inst.dest[1];
                station.setJFromRegister(this.registers[addr_reg]);
                station.setAddressOffset(addr_off);
            }

            // Load only
            if (s1_inst.type === INSTRUCTION_TYPE.LOAD)
                this.registers[s1_inst.dest].waitForStation(s1_rs);

            // Store only
            if (s1_inst.type === INSTRUCTION_TYPE.STORE)
                station.setKFromRegister(this.registers[s1_inst.src]);
        } else if (s1_inst !== null && s1_inst !== undefined) {
            console.log('stall'); // TODO descrição dos passos individuais em cada estágio
        }

        // 2 - Execute

        // Arithmetic operation
        for (let name of s2op_rs) {
            const station = this.reservation_stations[name];
            station.advanceFuncUnitStep();

            this.program_actions[station.getProgramOrder()] = 'Exec';
            if (station.getFuncUnitStep() === 0) {
                const j = station.getJValue();
                const k = station.getKValue();
                switch (station.getInstructionType()) {
                    case INSTRUCTION_TYPE.ADD:
                        station.setFuncUnitResult(j + k);
                        break;
                    case INSTRUCTION_TYPE.SUBTRACT:
                        station.setFuncUnitResult(j - k);
                        break;
                    case INSTRUCTION_TYPE.MULTIPLY:
                        station.setFuncUnitResult(j * k);
                        break;
                    case INSTRUCTION_TYPE.DIVIDE:
                        station.setFuncUnitResult(j / k);
                        break;
                }
            }
        }

        // Load/store step 1
        if (s2s1_rs !== null) {
            const station = this.reservation_stations[s2s1_rs];
            station.calculateEffectiveAddress();
            station.advanceFuncUnitStep();

            this.program_actions[station.getProgramOrder()] = 'Exec';
        }

        // Load step 2
        for (let name of s2s2_rs) {
            const station = this.reservation_stations[name];
            station.advanceFuncUnitStep();

            this.program_actions[station.getProgramOrder()] = 'Exec';
            if (station.getFuncUnitStep() === 0) {
                const srcAddr = station.getAddressFull();
                if (!(srcAddr in this.memory)) {
                    const instruction = this.program[station.getProgramOrder()];
                    this.memory[srcAddr] = rand.instructionValue(instruction.dest, instruction.name, instruction.type);
                }
                station.setFuncUnitResult(this.memory[srcAddr]);
            }
        }

        // 3 - Write

        // Arithmetic operation or load
        if (s3_rs !== null) {
            const station = this.reservation_stations[s3_rs];
            const result = station.getFuncUnitResult();
            for (let name in this.registers) {
                if (this.registers[name].busy() && this.registers[name].getValue() === s3_rs)
                    this.registers[name].setValue(result);
            }
            for (let name in this.reservation_stations) {
                const rsI = this.reservation_stations[name];
                if (!rsI.isJReady() && rsI.getJValue() === s3_rs)
                    rsI.setJValue(result);
                if (!rsI.isKReady() && rsI.getKValue() === s3_rs)
                    rsI.setKValue(result);
            }
            this.program_actions[station.getProgramOrder()] = 'Write';
            station.reset();
        }

        // Store
        for (let name of s3store_rs) {
            const station = this.reservation_stations[name];
            station.advanceFuncUnitStep();

            this.program_actions[station.getProgramOrder()] = 'Write';
            if (station.getFuncUnitStep() == 0) {
                this.memory[station.getAddressFull()] = station.getKValue();
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
            if (rs.busy && rs.getInstructionType() === type)
                pending.push(rs.getProgramOrder());
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
            if (!rs.busy && rs.isCompatible(instruction.type))
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
                    rs.isCompatible(INSTRUCTION_TYPE.ADD) || rs.isCompatible(INSTRUCTION_TYPE.SUBTRACT) ||
                    rs.isCompatible(INSTRUCTION_TYPE.MULTIPLY) || rs.isCompatible(INSTRUCTION_TYPE.DIVIDE)
                ) &&
                rs.isJReady() &&
                rs.isKReady() &&
                rs.getFuncUnitStep() <= rs.getFuncUnitDelay() &&
                rs.getFuncUnitStep() > 0
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
                (rs.isCompatible(INSTRUCTION_TYPE.LOAD) || rs.isCompatible(INSTRUCTION_TYPE.STORE)) &&
                rs.getFuncUnitStep() === rs.getFuncUnitDelay() &&
                rs.isJReady() &&
                rs.getProgramOrder() < cur_program_order
            ) {
                cur_name = name;
                cur_program_order = rs.getProgramOrder();
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
                rs.getInstructionType() === INSTRUCTION_TYPE.LOAD &&
                rs.getFuncUnitStep() < rs.getFuncUnitDelay() &&
                rs.getFuncUnitStep() > 0
            ) {
                const load_addr = this.program[rs.getProgramOrder()].src;

                let has_dependency = false;
                for (let i of pending_stores) {
                    const store_addr = this.program[i].dest;
                    if (i < rs.getProgramOrder() && load_addr[0] === store_addr[0] && load_addr[1] === store_addr[1])
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
                rs.getInstructionType() === INSTRUCTION_TYPE.STORE &&
                rs.getFuncUnitStep() < rs.getFuncUnitDelay() &&
                rs.isKReady()
            ) {
                const store_addr = this.program[rs.getProgramOrder()].src;

                let has_dependency = false;
                for (let i of pending_loads) {
                    const addr = this.program[i].src;
                    if (i < rs.getProgramOrder() && store_addr[0] === addr[0] && store_addr[1] === addr[1])
                        has_dependency = true;
                }
                for (let i of pending_stores) {
                    const addr = this.program[i].dest;
                    if (i < rs.getProgramOrder() && store_addr[0] === addr[0] && store_addr[1] === addr[1])
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
                rs.getInstructionType() !== INSTRUCTION_TYPE.STORE &&
                rs.getFuncUnitStep() <= 0
            )
                return name;
        }
        return null;
    }

}
