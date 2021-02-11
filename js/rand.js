import { INSTRUCTION_TYPE } from './assembly.js';

/**
 * Gera um número a partir de uma string, de forma determinística
 * @param {string} str
 * @returns {number}
 */
function numberFromString(str) {
    if (str.length > 0) {
        let num = str.charCodeAt(0);
        for (let i = 1; i < str.length; i++) {
            num = num ^ str.charCodeAt(i) << 17;
        }
        return num;
    } else {
        return 0;
    }
}

/**
 * Gera um número inteiro pseudo-aleatório, de tamanho pequeno, a partir de uma seed.
 * @param {string} seed
 * @returns {number}
 */
export function int(seed) {
    return Math.ceil(Math.max(numberFromString(seed), 1) % 999);
}

/**
 * Gera um número de ponto flutuante pseudo-aleatório, de tamanho pequeno, a partir de uma seed.
 * @param {string} seed
 * @returns {number}
 */
export function float(seed) {
    let n1 = numberFromString(seed);
    let n2 = parseInt(`${n1 * n1}`.padStart(4, '0').slice(1, 3));
    n1 = Math.max(n1, 1) % 99;
    n2 = Math.max(n2, 1) % 9;
    return parseFloat(`${n1}.${n2}`);
}

/**
 * Gera um valor pseudo-aleatório, de tamanho pequeno, para preencher o registrador/instrução indicado.
 * @param {string} register_name 
 * @param {string} instruction_name 
 * @param {INSTRUCTION_TYPE} instruction_type 
 */
export function instructionValue(register_name, instruction_name, instruction_type) {
    if (
        instruction_name[0] === 'f' && (
            (instruction_type != INSTRUCTION_TYPE.LOAD && instruction_type != INSTRUCTION_TYPE.STORE) ||
            register_name[0] === 'f'
        )
    )
        return float(register_name);
    else
        return int(register_name);
}
