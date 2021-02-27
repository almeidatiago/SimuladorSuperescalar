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
        for (let i in this.program.getCodeOrder())
            this.program_actions[i] = null;
    }

    /**
     * Efetua uma cópia profunda deste objeto.
     * @returns {State}
     */
    clone(cloneProgramActions = false) {
        let r = {};
        for (let name in this.registers)
            r[name] = this.registers[name].clone();

        let rs = {};
        for (let name in this.reservation_stations)
            rs[name] = this.reservation_stations[name].clone();

        let m = {};
        for (let addr in this.memory)
            m[addr] = this.memory[addr];

        let pa = {};
        if (cloneProgramActions)
            for (let act in this.program_actions)
                pa[act] = this.program_actions[act];

        let c = new State(this.program.clone(), r, m);
        c.cycle = this.cycle;
        c.instruction_queue = this.instruction_queue;
        c.reservation_stations = rs;
        if (cloneProgramActions)
            c.program_actions = pa;

        return c;
    }

    setStationJFromRegister(stationName, registerName, interSteps = []) {
        const station = this.reservation_stations[stationName];
        const register = this.registers[registerName];
        const regValue = register.getValue();

        if (register.busy()) {
            station.qj = regValue;
            interSteps.push([
                `O operando esq. da estação **${stationName}** é marcado para receber o valor do registrador **${registerName.toUpperCase()}**, que será produzido pela estação **${regValue}**.`,
                this.clone(true),
            ]);
        } else {
            station.setJValue(regValue);
            interSteps.push([
                `O operando esq. da estação **${stationName}** recebe o valor do registrador **${registerName.toUpperCase()}**, que já está disponível.`,
                this.clone(true),
            ]);
        }
    }

    setStationJFromImmediate(stationName, immediateValue, interSteps = []) {
        const station = this.reservation_stations[stationName];
        station.setJValue(immediateValue);
        interSteps.push([
            `O operando esq. da estação **${stationName}** recebe o valor imediato //${immediateValue}//.`,
            this.clone(true),
        ]);
    }

    setStationKFromRegister(stationName, registerName, interSteps = []) {
        const station = this.reservation_stations[stationName];
        const register = this.registers[registerName];
        const regValue = register.getValue();

        if (register.busy()) {
            station.qk = regValue;
            interSteps.push([
                `O operando dir. da estação **${stationName}** é marcado para receber o valor do registrador **${registerName.toUpperCase()}**, que será produzido pela estação **${regValue}**.`,
                this.clone(true),
            ]);
        } else {
            station.setKValue(regValue);
            interSteps.push([
                `O operando dir. da estação **${stationName}** recebe o valor do registrador **${registerName.toUpperCase()}**, que já está disponível.`,
                this.clone(true),
            ]);
        }
    }

    setStationKFromImmediate(stationName, immediateValue, interSteps = []) {
        const station = this.reservation_stations[stationName];
        station.setKValue(immediateValue);
        interSteps.push([
            `O operando dir. da estação **${stationName}** recebe o valor imediato //${immediateValue}//.`,
            this.clone(true),
        ]);
    }

    next_cycle() {
        this.cycle++;
        const prevInstructionQueue = this.instruction_queue;
        const interSteps = [];

        // Calcula as estações de reserva que serão utilizadas antes de efetuar os passos de processamento:
        // Fase 1
        let s1_inst = this.program.getNextInstruction();

        // Processamento das instruções de branching
        if (s1_inst !== null && s1_inst.type === INSTRUCTION_TYPE.BRANCH) {
            const destLabel = s1_inst.dest;

            if (s1_inst.cmp == undefined) {
                this.program_actions[this.instruction_queue] = 'Jump';
                this.instruction_queue++;
                this.program.advanceInstruction(destLabel);
                interSteps.push([
                    `A instrução \`${s1_inst.line}\` é executada, e as instruções do programa a partir da label //"${destLabel}"// são carregadas.`,
                    this.clone(true),
                ]);
            } else {
                if (this.registers[s1_inst.lhs].busy()) {
                    interSteps.push([
                        `A instrução \`${s1_inst.line}\` não pode ser executada, pois o valor do registrador **${s1_inst.lhs.toUpperCase()}** não está disponível.`,
                        this.clone(true),
                    ]);
                } else if (this.registers[s1_inst.rhs].busy()) {
                    interSteps.push([
                        `A instrução \`${s1_inst.line}\` não pode ser executada, pois o valor do registrador **${s1_inst.rhs.toUpperCase()}** não está disponível.`,
                        this.clone(true),
                    ]);
                } else {
                    const lhs = this.registers[s1_inst.lhs].getValue();
                    const rhs = this.registers[s1_inst.rhs].getValue();
                    const res = s1_inst.cmp(lhs, rhs);
                    
                    this.program_actions[this.instruction_queue] = 'Branch';
                    this.instruction_queue++;
                    if (res) {
                        this.program.advanceInstruction(destLabel);
                        interSteps.push([
                            `A instrução \`${s1_inst.line}\` é executada, e obtém o resultado //${res}//. As instruções do programa a partir da label //"${destLabel}"// são carregadas.`,
                            this.clone(true),
                        ]);
                    } else {
                        this.program.advanceInstruction();
                        interSteps.push([
                            `A instrução \`${s1_inst.line}\` é executada, e obtém o resultado //${res}//. As instruções continuam em sua ordem original.`,
                            this.clone(true),
                        ]);
                    }
                }
            }

            s1_inst = null;
        }

        const s1_rs = this.station_for_stage_one(s1_inst);
        // Fase 2
        const s2op_rs = this.stations_for_stage_two_operations();
        const s2s1_rs = this.station_for_stage_two_step_one();
        const s2s2_rs = this.stations_for_stage_two_step_two();
        // Fase 3
        const s3_rs = this.station_for_stage_three();
        const s3store_rs = this.stations_for_stage_three_store();

        if (s1_rs === null && s2op_rs.length == 0 && s2s1_rs === null && s2s2_rs.length === 0 && s3_rs === null && s3store_rs.length === 0 && prevInstructionQueue === this.instruction_queue)
            return [false, null];

        // 1 - Issue
        if (s1_rs !== null) {
            // Estação de reserva livre, issue continua...
            const station = this.reservation_stations[s1_rs];
            station.setupOperation(s1_inst.name, s1_inst.codeOrder, this.instruction_queue, s1_inst.type);

            this.program_actions[this.instruction_queue] = 'Issue';
            this.instruction_queue++;
            this.program.advanceInstruction();
            interSteps.push([
                `A instrução \`${s1_inst.line}\` é emitida para execução, e é colocada na estação de reserva **${s1_rs}**.`,
                this.clone(true),
            ]);

            // Arithmetic operation
            if (s1_inst.type >= INSTRUCTION_TYPE.ADD) {
                this.setStationJFromRegister(s1_rs, s1_inst.lhs, interSteps);
                if (s1_inst.imm !== undefined && s1_inst.imm !== null)
                    this.setStationKFromImmediate(s1_rs, s1_inst.imm, interSteps);
                else
                    this.setStationKFromRegister(s1_rs, s1_inst.rhs, interSteps);

                this.registers[s1_inst.dest].waitForStation(s1_rs);
                interSteps.push([
                    `O registrador **${s1_inst.dest.toUpperCase()}** é marcado para receber o valor que será produzido pela estação **${s1_rs}**.`,
                    this.clone(true),
                ]);
            }

            // Load or store
            if (s1_inst.type === INSTRUCTION_TYPE.LOAD || s1_inst.type === INSTRUCTION_TYPE.STORE) {
                if (s1_inst.imm !== undefined && s1_inst.imm !== null) {
                    this.setStationJFromImmediate(s1_rs, s1_inst.imm, interSteps);
                    for (let i = station.getFuncUnitDelay() - 1; i >= 0; i--)
                        station.advanceFuncUnitStep();
                    station.setFuncUnitResult(s1_inst.imm);
                } else {
                    const addr_reg = s1_inst.type === INSTRUCTION_TYPE.LOAD ? s1_inst.src[0] : s1_inst.dest[0];
                    const addr_off = s1_inst.type === INSTRUCTION_TYPE.LOAD ? s1_inst.src[1] : s1_inst.dest[1];
                    this.setStationJFromRegister(s1_rs, addr_reg, interSteps);
                    station.setAddressOffset(addr_off);

                    interSteps.push([
                        `O campo //A// da estação **${s1_rs}** recebe o valor de //offset// ${addr_off} para o cálculo de endereço.`,
                        this.clone(true),
                    ]);
                }
            }

            // Load only
            if (s1_inst.type === INSTRUCTION_TYPE.LOAD) {
                this.registers[s1_inst.dest].waitForStation(s1_rs);
                interSteps.push([
                    `O registrador **${s1_inst.dest.toUpperCase()}** é marcado para receber o valor que será produzido pela estação **${s1_rs}**.`,
                    this.clone(true),
                ]);
            }

            // Store only
            if (s1_inst.type === INSTRUCTION_TYPE.STORE)
                this.setStationKFromRegister(s1_rs, s1_inst.src, interSteps);
        } else if (s1_inst !== null && s1_inst !== undefined) {
            interSteps.push([
                `A instrução \`${s1_inst.line}\` não pode ser emitida para execução, pois todas as estações de reserva estão ocupadas.`,
                this.clone(true),
            ]);
        }

        // 2 - Execute

        // Arithmetic operation
        for (let name of s2op_rs) {
            const station = this.reservation_stations[name];
            station.advanceFuncUnitStep();
            station.setFuncUnitBusy(true);
            this.program_actions[station.getProgramOrder()] = 'Exec';
            interSteps.push([
                `A unidade funcional associada à estação **${name}** está em execução.`,
                this.clone(true),
            ]);

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
            station.setFuncUnitBusy(false);

            this.program_actions[station.getProgramOrder()] = 'Exec';
            interSteps.push([
                `É efetuado o cálculo de endereço efetivo para a estação **${s2s1_rs}**.`,
                this.clone(true),
            ]);
        }

        // Load step 2
        for (let name of s2s2_rs) {
            const station = this.reservation_stations[name];
            station.advanceFuncUnitStep();
            station.setFuncUnitBusy(true);
            this.program_actions[station.getProgramOrder()] = 'Exec';
            interSteps.push([
                `A unidade de memória associada à estação **${name}** está em execução.`,
                this.clone(true),
            ]);

            if (station.getFuncUnitStep() === 0) {
                const srcAddr = station.getAddressFull();
                if (!(srcAddr in this.memory)) {
                    const instruction = this.program.getAtExecutionOrder(station.getProgramOrder());
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
            interSteps.push([
                `A unidade associada à estação **${s3_rs}** terminou de executar, e está pronta para transmitir o resultado.`,
                this.clone(true),
            ]);

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
            station.setFuncUnitBusy(false);
            interSteps.push([
                'O resultado da execução é transmitido simultaneamente pelo //CDB// para todos os recipientes.',
                this.clone(true),
            ]);

            station.reset();
            interSteps.push([
                `A estação de reserva **${s3_rs}** é marcada como livre.`,
                this.clone(true),
            ]);
        }

        // Store
        for (let name of s3store_rs) {
            const station = this.reservation_stations[name];
            station.advanceFuncUnitStep();
            station.setFuncUnitBusy(true);
            this.program_actions[station.getProgramOrder()] = 'Write';

            if (station.getFuncUnitStep() == 0) {
                station.setFuncUnitBusy(false);
                interSteps.push([
                    `A escrita em memória associada à estação **${name}** terminou de executar.`,
                    this.clone(true),
                ]);

                this.memory[station.getAddressFull()] = station.getKValue();
                station.reset();
                interSteps.push([
                    `A estação de reserva **${name}** é marcada como livre.`,
                    this.clone(true),
                ]);
            } else {
                interSteps.push([
                    `A unidade de memória associada à estação **${name}** está executando a escrita em memória.`,
                    this.clone(true),
                ]);
            }
        }

        return [true, interSteps];
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
                pending.push(name);
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
        stations = stations.sort((a, b) => {
            return this.reservation_stations[b].getProgramOrder() - this.reservation_stations[a].getProgramOrder();
        });
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
                let has_dependency = false;

                const rs_inst = this.program.getAtExecutionOrder(rs.getProgramOrder());
                if (rs_inst.imm == undefined) {
                    const load_addr = rs_inst.src;
                    for (let strName of pending_stores) {
                        const strSt = this.reservation_stations[strName];
                        const store_addr = this.program.getAtExecutionOrder(strSt.getProgramOrder()).dest;
                        const storeEfAddr = strSt.getAddressFull();
                        if (storeEfAddr != null && storeEfAddr != undefined) {
                            if (strSt.getProgramOrder() < rs.getProgramOrder() && storeEfAddr === rs.getAddressFull())
                                has_dependency = true;
                        } else {
                            if (strSt.getProgramOrder() < rs.getProgramOrder() && load_addr[0] === store_addr[0] && load_addr[1] === store_addr[1])
                                has_dependency = true;
                        }
                    }
                }

                if (!has_dependency)
                    stations.push(name);
            }
        }
        stations = stations.sort((a, b) => {
            return this.reservation_stations[b].getProgramOrder() - this.reservation_stations[a].getProgramOrder();
        });
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
                const store_addr = this.program.getAtExecutionOrder(rs.getProgramOrder()).src;

                let has_dependency = false;
                for (let loadName of pending_loads) {
                    const loadSt = this.reservation_stations[loadName];
                    const i_inst = this.program.getAtExecutionOrder(loadSt.getProgramOrder());
                    if (i_inst.imm !== undefined && i_inst.imm !== null)
                        continue;

                    const addr = i_inst.src;
                    const efAddr = loadSt.getAddressFull();
                    if (efAddr != null && efAddr != undefined) {
                        if (loadSt.getProgramOrder() < rs.getProgramOrder() && efAddr === rs.getAddressFull())
                            has_dependency = true;
                    } else {
                        if (loadSt.getProgramOrder() < rs.getProgramOrder() && store_addr[0] === addr[0] && store_addr[1] === addr[1])
                            has_dependency = true;
                    }
                }
                for (let strName of pending_stores) {
                    const strSt = this.reservation_stations[strName];
                    const addr = this.program.getAtExecutionOrder(strSt.getProgramOrder()).dest;
                    const efAddr = strSt.getAddressFull();
                    if (efAddr != null && efAddr != undefined) {
                        if (strSt.getProgramOrder() < rs.getProgramOrder() && efAddr === rs.getAddressFull())
                            has_dependency = true;
                    } else {
                        if (strSt.getProgramOrder() < rs.getProgramOrder() && store_addr[0] === addr[0] && store_addr[1] === addr[1])
                            has_dependency = true;
                    }
                }

                if (!has_dependency)
                    stations.push(name);
            }
        }
        stations = stations.sort((a, b) => {
            return this.reservation_stations[b].getProgramOrder() - this.reservation_stations[a].getProgramOrder();
        });
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
