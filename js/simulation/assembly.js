/**
 * Tipos das instruções suportadas.
 * @readonly
 * @enum {number}
 */
export const INSTRUCTION_TYPE = {
    LOAD: 0,
    STORE: 1,
    ADD: 2,
    SUBTRACT: 3,
    MULTIPLY: 4,
    DIVIDE: 5,
    BRANCH: 6,
};

/** Instruções de execução. */
export class Instruction {

    /**
     * @param {string} line Instrução original.
     * @param {string} name Comando específico.
     * @param {INSTRUCTION_TYPE} type Tipo de instrução.
     */
    constructor(line, name, type) {
        this.line = line;
        this.name = name;
        this.type = type;
        this.codeOrder = null;

        // Mantém lista dos registratores que cada instrução utiliza
        this.src_registers = new Set();
        this.dest_registers = new Set();
    }

    /**
     * Descreve a instrução.
     */
    inspect() {
        switch (this.type) {
            case INSTRUCTION_TYPE.LOAD:
                return 'Carrega';
            case INSTRUCTION_TYPE.STORE:
                return 'Armazena';
            case INSTRUCTION_TYPE.ADD:
                return 'Efetua a soma';
            case INSTRUCTION_TYPE.SUBTRACT:
                return 'Efetua a subtração';
            case INSTRUCTION_TYPE.MULTIPLY:
                return 'Efetua a multiplicação';
            case INSTRUCTION_TYPE.DIVIDE:
                return 'Efetua a divisão';
        }
    }

    /**
     * Efetua uma cópia profunda deste objeto.
     * @returns {Instruction}
     */
    clone() {
        const c = new Instruction(this.line, this.name, this.type);
        c.codeOrder = this.codeOrder;
        return c;
    }

}

/** Instruções de load. */
export class LoadInstruction extends Instruction {

    /**
     * @param {string} line Instrução original.
     * @param {string} name Comando específico.
     * @param {string} src_addr Registrador com endereço de origem.
     * @param {number} src_offset Offset de endereço.
     * @param {string} dest Registrador de destino.
     */
    constructor(line, name, src_addr, src_offset, dest) {
        super(line, name, INSTRUCTION_TYPE.LOAD);
        this.src = [src_addr, src_offset];
        this.dest = dest;

        this.src_registers.add(src_addr);
        this.dest_registers.add(dest);
    }

    /**
     * Descreve a instrução.
     */
    inspect() {
        return `${super.inspect()} do endereço em ${this.src[0]}, com offset de ${this.src[1]}, para o registrador ${this.dest}.`;
    }

    /**
     * Efetua uma cópia profunda deste objeto.
     * @returns {LoadInstruction}
     */
    clone() {
        return new LoadInstruction(this.line, this.name, this.src[0], this.src[1], this.dest);
    }

}

/** Instruções de load de valor imediato. */
export class ImmLoadInstruction extends Instruction {

    /**
     * @param {string} line Instrução original.
     * @param {string} name Comando específico.
     * @param {string} imm Valor imediato.
     * @param {string} dest Registrador de destino.
     */
    constructor(line, name, imm, dest) {
        super(line, name, INSTRUCTION_TYPE.LOAD);
        this.imm = imm;
        this.dest = dest;

        this.dest_registers.add(dest);
    }

    /**
     * Descreve a instrução.
     */
    inspect() {
        return `${super.inspect()} o valor imediato ${this.imm} para o registrador ${this.dest}.`;
    }

    /**
     * Efetua uma cópia profunda deste objeto.
     * @returns {ImmLoadInstruction}
     */
    clone() {
        return new ImmLoadInstruction(this.line, this.name, this.imm, this.dest);
    }

}

/** Instruções de store. */
export class StoreInstruction extends Instruction {

    /**
     * @param {string} line Instrução original.
     * @param {string} name Comando específico.
     * @param {string} src Registrador de origem.
     * @param {string} dest_addr Registrador com endereço de destino.
     * @param {number} dest_offset Offset de endereço.
     */
    constructor(line, name, src, dest_addr, dest_offset) {
        super(line, name, INSTRUCTION_TYPE.STORE);
        this.src = src;
        this.dest = [dest_addr, dest_offset];

        this.src_registers.add(src);
        this.src_registers.add(dest_addr);
    }

    /**
     * Descreve a instrução.
     */
    inspect() {
        return `${super.inspect()} o valor em ${this.src} para o endereço em ${this.dest[0]}, com offset de ${this.dest[1]}.`;
    }

    /**
     * Efetua uma cópia profunda deste objeto.
     * @returns {StoreInstruction}
     */
    clone() {
        return new StoreInstruction(this.line, this.name, this.src, this.dest[0], this.dest[1]);
    }

}

/** Instruções aritméticas. */
export class ArithmeticInstruction extends Instruction {

    /**
     * @param {string} line Instrução original.
     * @param {string} name Comando específico.
     * @param {INSTRUCTION_TYPE} type Tipo da operação.
     * @param {string} lhs Operando esquerdo.
     * @param {string} rhs Operando direito.
     * @param {string} dest Registrador de destino.
     */
    constructor(line, name, type, lhs, rhs, dest) {
        super(line, name, type);
        this.lhs = lhs;
        this.rhs = rhs;
        this.dest = dest;

        this.src_registers.add(rhs);
        this.src_registers.add(lhs);
        this.dest_registers.add(dest);
    }

    /**
     * Descreve a instrução.
     */
    inspect() {
        return `${super.inspect()} do valor em ${this.lhs} com o valor em ${this.rhs}, e armazena o resultado em ${this.dest}.`;
    }

    /**
     * Efetua uma cópia profunda deste objeto.
     * @returns {ArithmeticInstruction}
     */
    clone() {
        return new ArithmeticInstruction(this.line, this.name, this.type, this.lhs, this.rhs, this.dest);
    }

}

/** Instruções aritméticas de valor imediato. */
export class ImmArithmeticInstruction extends Instruction {

    /**
     * @param {string} line Instrução original.
     * @param {string} name Comando específico.
     * @param {INSTRUCTION_TYPE} type Tipo da operação.
     * @param {string} lhs Operando esquerdo.
     * @param {string} imm Valor imediato.
     * @param {string} dest Registrador de destino.
     */
    constructor(line, name, type, lhs, imm, dest) {
        super(line, name, type);
        this.lhs = lhs;
        this.imm = imm;
        this.dest = dest;

        this.src_registers.add(lhs);
        this.dest_registers.add(dest);
    }

    /**
     * Descreve a instrução.
     */
    inspect() {
        return `${super.inspect()} do valor em ${this.lhs} com o valor ${this.imm}, e armazena o resultado em ${this.dest}.`;
    }

    /**
     * Efetua uma cópia profunda deste objeto.
     * @returns {ImmArithmeticInstruction}
     */
    clone() {
        return new ImmArithmeticInstruction(this.line, this.name, this.type, this.lhs, this.imm, this.dest);
    }

}

/** Instruções de branching. */
export class BranchInstruction extends Instruction {

    /**
     * @param {string} line Instrução original.
     * @param {string} name Comando específico.
     * @param {string} lhs Operando esquerdo.
     * @param {string} rhs Operando direito.
     * @param {string} dest Label de destino.
     * @param {*} cmp Função de comparação.
     */
    constructor(line, name, lhs, rhs, dest, cmp) {
        super(line, name, INSTRUCTION_TYPE.BRANCH);
        this.lhs = lhs;
        this.rhs = rhs;
        this.dest = dest;
        this.cmp = cmp;

        this.src_registers.add(rhs);
        this.src_registers.add(lhs);
    }

    /**
     * Efetua uma cópia profunda deste objeto.
     * @returns {BranchInstruction}
     */
    clone() {
        return new BranchInstruction(this.line, this.name, this.type, this.lhs, this.rhs, this.dest, this.cmp);
    }

}

/** Instruções de jumping. */
export class JumpInstruction extends Instruction {

    /**
     * @param {string} line Instrução original.
     * @param {string} name Comando específico.
     * @param {string} dest Label de destino.
     */
    constructor(line, name, dest) {
        super(line, name, INSTRUCTION_TYPE.BRANCH);
        this.dest = dest;
    }

    /**
     * Efetua uma cópia profunda deste objeto.
     * @returns {JumpInstruction}
     */
    clone() {
        return new JumpInstruction(this.line, this.name, this.dest);
    }

}

/**
 * Processa instruções de assembly RISC-V em estruturas nativas.
 *
 * @param {string} line Uma única linha de instrução para ser processada.
 * @returns {Instruction}
 */
function parseInstruction(line) {
    let match;

    // Instruções de load a partir de endereço, ex.: lw x5, 40(x6)
    if ((match = /(l[bhwdq]u?|fl[wdq])\s+(\w+),?\s*(-?\d+)\((\w+)\)/.exec(line)) !== null)
        return new LoadInstruction(match[0], match[1], match[4], parseInt(match[3]), match[2]);

    // Instruções de load a partir de endereço, ex.: lw x5, x6, 40
    if ((match = /(l[bhwdq]u?|fl[wdq])\s+(\w+),?\s*(\w+),?\s*(-?\d+)/.exec(line)) !== null)
        return new LoadInstruction(match[0], match[1], match[3], parseInt(match[4]), match[2]);

    // Instruções de load de valor imediato
    if ((match = /(liu?)\s+(\w+),?\s*(-?\d+)/.exec(line)) !== null)
        return new ImmLoadInstruction(match[0], match[1], parseInt(match[3]), match[2]);

    // Instruções de store, ex.: sw a1, -16(s0)
    if ((match = /(s[bhwdq]|fs[wdq])\s+(\w+),?\s*(-?\d+)\((\w+)\)/.exec(line)) !== null)
        return new StoreInstruction(match[0], match[1], match[2], match[4], parseInt(match[3]));

    // Instruções de store, ex.: sw a1, s0, -16
    if ((match = /(s[bhwdq]|fs[wdq])\s+(\w+),?\s*(\w+),?\s*(-?\d+)/.exec(line)) !== null)
        return new StoreInstruction(match[0], match[1], match[2], match[3], parseInt(match[4]));

    // Instruções de adição, ex.: add x1, x2, x3
    if ((match = /(add[wd]?|fadd\.[sdq])\s+(\w+),?\s*(\w+),?\s*(\w+)/.exec(line)) !== null)
        return new ArithmeticInstruction(match[0], match[1], INSTRUCTION_TYPE.ADD, match[3], match[4], match[2]);
    if ((match = /^\s*(addi[wd]?)\s+(\w+)(?:,|\s)\s*(\w+)(?:,|\s)\s*(-?\d+)\s*$/.exec(line)) !== null)
        return new ImmArithmeticInstruction(match[0], match[1], INSTRUCTION_TYPE.ADD, match[3], parseInt(match[4]), match[2]);

    // Instruções de subtração, ex.: sub a2, a0, a1
    if ((match = /(sub[wd]?|fsub\.[sdq])\s+(\w+),?\s*(\w+),?\s*(\w+)/.exec(line)) !== null)
        return new ArithmeticInstruction(match[0], match[1], INSTRUCTION_TYPE.SUBTRACT, match[3], match[4], match[2]);

    // Instruções de multiplicação, ex.: mul a2, a0, a1
    if ((match = /(mul[wd]?|fmul\.[sdq])\s+(\w+),?\s*(\w+),?\s*(\w+)/.exec(line)) !== null)
        return new ArithmeticInstruction(match[0], match[1], INSTRUCTION_TYPE.MULTIPLY, match[3], match[4], match[2]);

    // Instruções de divisão, ex.: div a2, a0, a1
    if ((match = /(div[wd]?|fdiv\.[sdq])\s+(\w+),?\s*(\w+),?\s*(\w+)/.exec(line)) !== null)
        return new ArithmeticInstruction(match[0], match[1], INSTRUCTION_TYPE.DIVIDE, match[3], match[4], match[2]);

    // Instruções de branching
    if ((match = /beq\s+(\w+),?\s*(\w+),?\s*(\w+)/.exec(line)) !== null)
        return new BranchInstruction(match[0], 'beq', match[1], match[2], match[3], (a, b) => a == b);
    if ((match = /bne\s+(\w+),?\s*(\w+),?\s*(\w+)/.exec(line)) !== null)
        return new BranchInstruction(match[0], 'bne', match[1], match[2], match[3], (a, b) => a != b);
    if ((match = /(bltu?)\s+(\w+),?\s*(\w+),?\s*(\w+)/.exec(line)) !== null)
        return new BranchInstruction(match[0], match[1], match[2], match[3], match[4], (a, b) => a < b);
    if ((match = /(bgeu?)\s+(\w+),?\s*(\w+),?\s*(\w+)/.exec(line)) !== null)
        return new BranchInstruction(match[0], match[1], match[2], match[3], match[4], (a, b) => a >= b);

    // Instruções de jumping
    if ((match = /j\s+(\w+)/.exec(line)) !== null)
        return new JumpInstruction(match[0], 'j', match[1]);

    return false;
}

export class Program {

    constructor(instructions, sections, sectionOrder) {
        this.instructions = instructions;
        this.sections = sections;
        this.sectionOrder = sectionOrder;

        this.counter = 0;
        this.curSection = 0;
        this.curInstruction = 0;
        this.executionOrder = [];
        
        this.codeOrder = {};
        for (let i = 0; i < this.instructions.length; i++) {
            this.codeOrder[i] = this.instructions[i];
            this.instructions[i].codeOrder = i;
        }

        this.recalculateVisibleQueue();
    }

    getCurSection() {
        return this.sections[this.sectionOrder[this.curSection]];
    }

    getCurInstruction() {
        return this.getCurSection()[this.curInstruction];
    }

    getVisibleQueueLength() {
        return this.instructions.length;
    }

    recalculateVisibleQueue() {
        this.visibleQueuePos = 0;
        this.visibleQueue = [];
        this.remainingQueue = [];

        let section = this.curSection;
        let inst = this.curInstruction;
        let brk = false;
        do {
            const curSec = this.sections[this.sectionOrder[section]];
            if (inst < curSec.length) {
                if (brk)
                    this.remainingQueue.push(curSec[inst]);
                else
                    this.visibleQueue.push(curSec[inst]);
            }

            inst++;
            if (this.instructions[this.visibleQueue[this.visibleQueue.length - 1]].type === INSTRUCTION_TYPE.BRANCH)
                brk = true;

            if (inst >= curSec.length) {
                inst = 0;
                section++;
            }
        } while (section < this.sectionOrder.length);
    }

    /**
     * Retorna a primeira instrução na fila de espera de execução.
     */
    getNextInstruction() {
        if (this.curSection < this.sectionOrder.length && this.curInstruction < this.getCurSection().length)
            return this.instructions[this.getCurInstruction()];

        return null;
    }

    /**
     * Marca a última instrução emitida por 'getNextInstruction' como executada, e avança a execução.
     */
    advanceInstruction(jumpLabel = null) {
        this.counter++;
        this.executionOrder.push(this.getCurInstruction());
        this.visibleQueuePos++;

        if (jumpLabel == null || this.sectionOrder.indexOf(jumpLabel) < 0) {
            this.curInstruction++;
            
            if (this.getCurSection() && this.curInstruction >= this.getCurSection().length) {
                this.curInstruction = 0;
                this.curSection++;

                while (this.curSection < this.sectionOrder.length && this.getCurSection().length === 0)
                    this.curSection++;
            }
        } else {
            this.curInstruction = 0;
            this.curSection = this.sectionOrder.indexOf(jumpLabel);

            while (this.curSection < this.sectionOrder.length && this.getCurSection().length === 0)
                this.curSection++;
        }

        if (this.curSection < this.sectionOrder.length)
            this.recalculateVisibleQueue();
    }

    /**
     * Retorna as instruções do programa, associadas a sua ordem em código.
     */
    getCodeOrder() {
        return this.codeOrder;
    }

    /**
     * Retorna a instrução na posição indicada, em relação sua ordem em código.
     */
    getAtCodeOrder(order) {
        return this.instructions[order];
    }

    /**
     * Retorna a instrução na posição indicada, em relação a ordem em que foi executada.
     */
    getAtExecutionOrder(order) {
        return this.instructions[this.executionOrder[order]];
    }

    /**
     * Retorna o conjunto atual de instruções aguardando execução.
     */
    getInstructionQueue() {
        return [this.visibleQueue.map(i => this.instructions[i]), this.remainingQueue.map(i => this.instructions[i])];
    }

    /**
     * Retorna a posição da primeira instrução na fila de espera de execução, em relação ao conjunto atual de
     * instruções aguardando execução.
     */
    getInstructionQueuePos() {
        return this.visibleQueuePos;
    }

    /**
     * Clona o programa.
     */
    clone() {
        let eo = [];
        for (let value of this.executionOrder)
            eo.push(value);

        let co = {};
        for (let key in this.codeOrder)
            co[key] = this.codeOrder[key];

        let vq = [];
        for (let value of this.visibleQueue)
            vq.push(value);
            
        let rq = [];
        for (let value of this.remainingQueue)
            rq.push(value);

        let c = new Program(this.instructions, this.sections, this.sectionOrder);
        c.counter = this.counter;
        c.curSection = this.curSection;
        c.curInstruction = this.curInstruction;
        c.visibleQueuePos = this.visibleQueuePos;
        c.executionOrder = eo;
        c.codeOrder = co;
        c.visibleQueue = vq;
        c.remainingQueue = rq;
        return c;
    }

}

/**
 * Processa o programa recebido linha-a-linha e retorna estruturas descrevendo cada instrução.
 * @param {string} program Programa em assembly RISC-V.
 * @returns {Instruction[]}
 */
export function parse(program) {
    // Remove comentários e compacta whitespace
    let lines = [];
    const initialValues = {};
    for (const line of program.split('\n')) {
        // Coleta valores iniciais
        const init = line.match(/#\s*(\S+)\s*=\s*(-?\d*\.?\d+)/);
        if (init)
            initialValues[init[1]] = parseFloat(init[2]);

        lines.push(line.replace(/#.*$/, '').trim().replace(/\s+/g, ' '));
    }
    lines = lines.filter(line => line.length > 0);

    // Divide instruções em diferentes seções, de acordo com labels
    let curSection = '';
    const instructions = [];
    const sections = {};
    const sectionOrder = [];
    for (let i = 0; i < lines.length; i++) {
        let sectionName = lines[i].match(/([^:]+):/);
        if (sectionName == null && i === 0)
            sectionName = ['main:', 'main'];
        
        if (sectionName != null && curSection != sectionName[1]) {
            curSection = sectionName[1];
            sectionOrder.push(curSection);
        }

        if (!(curSection in sections))
            sections[curSection] = [];
            
        const inst = parseInstruction(lines[i]);
        if (inst) {
            instructions.push(inst);
            sections[curSection].push(instructions.length - 1);
        }
    }

    // Ignora programas vazios
    if (instructions.length === 0 || sectionOrder.length === 0)
        return null;

    return [instructions, sections, sectionOrder, initialValues];
}
