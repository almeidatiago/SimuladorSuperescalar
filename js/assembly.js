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
        return new Instruction(this.line, this.name, this.type);
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

    // Instruções de store, ex.: sw a1, -16(s0)
    if ((match = /(s[bhwdq]|fs[wdq])\s+(\w+),?\s*(-?\d+)\((\w+)\)/.exec(line)) !== null)
        return new StoreInstruction(match[0], match[1], match[2], match[4], parseInt(match[3]));

    // Instruções de store, ex.: sw a1, s0, -16
    if ((match = /(s[bhwdq]|fs[wdq])\s+(\w+),?\s*(\w+),?\s*(-?\d+)/.exec(line)) !== null)
        return new StoreInstruction(match[0], match[1], match[2], match[3], parseInt(match[4]));

    // Instruções de adição, ex.: add x1, x2, x3
    if ((match = /(add[wd]?|fadd\.[sdq])\s+(\w+),?\s*(\w+),?\s*(\w+)/.exec(line)) !== null)
        return new ArithmeticInstruction(match[0], match[1], INSTRUCTION_TYPE.ADD, match[3], match[4], match[2]);

    // Instruções de subtração, ex.: sub a2, a0, a1
    if ((match = /(sub[wd]?|fsub\.[sdq])\s+(\w+),?\s*(\w+),?\s*(\w+)/.exec(line)) !== null)
        return new ArithmeticInstruction(match[0], match[1], INSTRUCTION_TYPE.SUBTRACT, match[3], match[4], match[2]);

    // Instruções de multiplicação, ex.: mul a2, a0, a1
    if ((match = /(mul[wd]?|fmul\.[sdq])\s+(\w+),?\s*(\w+),?\s*(\w+)/.exec(line)) !== null)
        return new ArithmeticInstruction(match[0], match[1], INSTRUCTION_TYPE.MULTIPLY, match[3], match[4], match[2]);

    // Instruções de divisão, ex.: div a2, a0, a1
    if ((match = /(div[wd]?|fdiv\.[sdq])\s+(\w+),?\s*(\w+),?\s*(\w+)/.exec(line)) !== null)
        return new ArithmeticInstruction(match[0], match[1], INSTRUCTION_TYPE.DIVIDE, match[3], match[4], match[2]);

    return false;
}

/**
 * Processa o programa recebido linha-a-linha e retorna estruturas descrevendo cada instrução.
 * @param {string} program Programa em assembly RISC-V.
 * @returns {Instruction[]}
 */
export function parse(program) {
    return program
        .trim()
        .split('\n')
        .map((line) => parseInstruction(line.trim()));
}
