/** Estação de reserva. */
export default class ReservationStation {

    /**
     * @param {INSTRUCTION_TYPE[]} operations Tipos de instruções suportadas por esta estação.
     * @param {number} functionalUnitDelay Número de ciclos que a unidade funcional desta estação deve levar para executar.
     */
    constructor(operations, functionalUnitDelay) {
        this.operations = operations;
        this.functionalUnitDelay = functionalUnitDelay;
        this.reset();
    }

    /**
     * Retorna as propriedades desta estação para seus valores iniciais.
     */
    reset() {
        this.programOrder = null;
        this.instructionType = null;
        this.functionalUnitStep = 0;
        this.functionalUnitBusy = false;
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
     * Marca esta estação como ocupada, e a configura com as propriedades indicadas.
     */
    setupOperation(operationName, instructionOrder, instructionType) {
        this.busy = true;
        this.op = operationName;
        this.programOrder = instructionOrder;
        this.functionalUnitStep = this.functionalUnitDelay;
        this.instructionType = instructionType;
    }

    /**
     * Retorna true caso esta estação de reserva seja compatível com o tipo de instrução indicado.
     */
    isCompatible(instructionType) {
        return this.operations.indexOf(instructionType) > -1;
    }

    /**
     * Verdadeiro se o valor esperado por Qj já foi produzido e armazenado em Vj.
     * @returns {boolean}
     */
    isJReady() {
        return this.qj === null && this.vj !== null;
    }

    /**
     * Verdadeiro se o valor esperado por Qk já foi produzido e armazenado em Vk.
     * @returns {boolean}
     */
    isKReady() {
        return this.qk === null && this.vk !== null;
    }

    /**
     * Retorna o valor esperado por Qj, caso esteja disponível, ou o nome da estação de reserva pela qual ele está
     * esperando.
     */
    getJValue() {
        return this.isJReady() ? this.vj : this.qj;
    }

    /**
     * Retorna o valor esperado por Qk, caso esteja disponível, ou o nome da estação de reserva pela qual ele está
     * esperando.
     */
    getKValue() {
        return this.isKReady() ? this.vk : this.qk;
    }

    /**
     * Retorna o nome da operação sendo processada por esta estação de espera.
     */
    getOp() {
        if (!this.busy)
            return null;
        return this.op;
    }

    /**
     * Retorna o valor de offset armazenado no campo 'A' desta estação, caso exista.
     */
    getAddressOffset() {
        if (!Array.isArray(this.a))
            return null;
        if (this.a.length > 1)
            return this.a[1];
        return this.a[0];
    }

    /**
     * Retorna o valor completo do endereço armazenado no campo 'A' desta estação, caso esteja disponível.
     */
    getAddressFull() {
        if (!Array.isArray(this.a) || this.a.length <= 1)
            return null;
        return this.a[0];
    }

    /**
     * Retorna o tipo da instrução sendo processada por esta estação, caso alguma exista.
     */
    getInstructionType() {
        if (!this.busy)
            return null;
        return this.instructionType;
    }

    /**
     * Retorna a ordem de execução da instrução sendo processada por esta estação, caso alguma exista.
     */
    getProgramOrder() {
        if (!this.busy)
            return null;
        return this.programOrder;
    }

    /**
     * Retorna em que passo está a unidade funcional associada a esta estação, caso alguma instrução esteja sendo
     * processada.
     */
    getFuncUnitStep() {
        if (!this.busy)
            return null;
        return this.functionalUnitStep;
    }

    /**
     * Retorna o numero de passos que a unidade funcional associada a esta estação leva para concluir seu processamento.
     */
    getFuncUnitDelay() {
        return this.functionalUnitDelay;
    }

    /**
     * Retorna true se a unidade funcional associada a esta estação estiver em processamento.
     */
    getFuncUnitBusy() {
        return this.functionalUnitBusy;
    }

    /**
     * Retorna o valor do resultado da unidade funcional associada a esta estação, caso alguma instrução esteja sendo
     * processada.
     */
    getFuncUnitResult() {
        if (!this.busy)
            return null;
        return this.result;
    }

    /**
     * Define se a unidade funcional associada a esta estação ainda está em processamento.
     */
    setFuncUnitBusy(value) {
        this.functionalUnitBusy = value;
    }

    /**
     * Sobrescreve o valor do resultado da unidade funcional associada a esta estação, caso alguma instrução esteja
     * sendo processada.
     */
    setFuncUnitResult(value) {
        if (!this.busy)
            return null;
        this.result = value;
    }

    /**
     * Sobrescreve o valor de Vj e Qj.
     * @param {number} value 
     */
    setJValue(value) {
        this.vj = value;
        this.qj = null;
    }

    /**
     * Sobrescreve o valor de Vk e Qk.
     * @param {number} value 
     */
    setKValue(value) {
        this.vk = value;
        this.qk = null;
    }

    /**
     * Decide o valor de Vj e Qj de acordo com o estado do registrador indicado. Utilizado durante a fase 'Issue'.
     * @param {Register} register 
     */
    setJFromRegister(register) {
        const regValue = register.getValue();
        if (register.busy())
            this.qj = regValue;
        else
            this.setJValue(regValue);
    }

    /**
     * Decide o valor de Vk e Qk de acordo com o estado do registrador indicado. Utilizado durante a fase 'Issue'.
     * @param {Register} register 
     */
    setKFromRegister(register) {
        const regValue = register.getValue();
        if (register.busy())
            this.qk = regValue;
        else
            this.setKValue(regValue);
    }

    /**
     * Sobrescreve o valor do campo 'A' desta estação com o valor de offset indicado.
     * @param {number} offset 
     */
    setAddressOffset(offset) {
        this.a = [offset];
    }

    /**
     * Avança a unidade funcional associada a esta estação em um passo, caso alguma instrução esteja sendo processada.
     */
    advanceFuncUnitStep() {
        if (!this.busy || this.functionalUnitStep <= 0)
            return;
        this.functionalUnitStep--;
    }

    /**
     * Efetua o cálculo de endereço para esta estação, caso ambos os valores de 'A' e 'Vj' estejam disponíveis.
     */
    calculateEffectiveAddress() {
        if (!Array.isArray(this.a) || !this.isJReady())
            return;
        this.a = [this.a[0] + this.vj, this.a[0], this.vj];
    }

    /**
     * Descreve o valor armazenado no campo 'A' desta estação.
     */
    inspectAddressValue() {
        if (!Array.isArray(this.a))
            return '';
        if (this.a.length > 1)
            return `${this.a[0]} (${this.a[2]}+${this.a[1]})`;
        return `${this.a[0]}`;
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
        let c = new ReservationStation(this.operations, this.functionalUnitDelay);
        c.programOrder = this.programOrder;
        c.functionalUnitStep = this.functionalUnitStep;
        c.functionalUnitBusy = this.functionalUnitBusy;
        c.result = this.result;
        c.instructionType = this.instructionType;
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
