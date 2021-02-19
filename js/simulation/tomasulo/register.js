/** Registrador virtual. */
export default class Register {

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
     * Retorna o valor deste registrador, caso haja um valor disponível, ou o nome da estação de reserva pela qual ele
     * está esperando.
     */
    getValue() {
        return this.busy() ? this.qi : this.value;
    }

    /**
     * Sobrescreve o valor deste registrador, resetando a flag Qi caso esteja ativada.
     * @param {number} value
     */
    setValue(value) {
        this.qi = null;
        this.value = value;
    }

    /**
     * Define que o registrador receberá o valor a ser produzido por uma uma estação de reserva.
     * @param {string} name 
     */
    waitForStation(name) {
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
