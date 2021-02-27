import { Arrow } from './components/arrow.js';
import { INSTRUCTION_TYPE } from './simulation/assembly.js';
import { Multibox } from './components/multibox.js';
import { Table } from './components/table.js';

// Inicializa canvas fabric sobre o canvas na página principal
const canvas = new fabric.Canvas('canvas', {
    selection: false,
});

/**
 * Impede que o conteúdo do canvas seja movido para fora da tela.
 */
canvas.clampViewport = function () {
    const zoom = this.getZoom();
    const halfWidth = this.getWidth() * 0.5;
    const halfHeight = this.getHeight() * 0.5;
    const zoomWidth = halfWidth * zoom;
    const zoomHeight = halfHeight * zoom;
    let vpt = this.viewportTransform;
    vpt[4] = Math.min(Math.max(vpt[4], halfWidth - zoomWidth), halfWidth + zoomWidth);
    vpt[5] = Math.min(Math.max(vpt[5], halfHeight - zoomHeight), halfHeight + zoomHeight);
};

/**
 * Centraliza conteúdo no canvas.
 */
canvas.centerView = function () {
    this.setZoom(0.9);
    let vpt = this.viewportTransform;
    vpt[4] = this.getWidth() * 0.5;
    vpt[5] = this.getHeight() * 0.5;
};

/**
 * Atualiza dimensões do canvas de acordo com as dimensões do layout.
 */
canvas.updateDimensions = function () {
    const canvasParent = document.getElementById('tab-visual');
    this.setDimensions({
        width: canvasParent.clientWidth,
        height: canvasParent.clientHeight,
    });
    this.clampViewport();
};

/**
 * Evento de mousedown, efetua dragging do canvas.
 */
canvas.on('mouse:down', function (opt) {
    const e = opt.e;
    if (!e.altKey && !e.shiftKey && !e.ctrlKey) {
        canvas.setCursor('grabbing');
        this.isDragging = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
    }
});

/**
 * Evento de mousemove, efetua dragging do canvas.
 */
canvas.on('mouse:move', function (opt) {
    if (this.isDragging) {
        canvas.setCursor('grabbing');
        const e = opt.e;
        let vpt = this.viewportTransform;
        vpt[4] += e.clientX - this.lastX;
        vpt[5] += e.clientY - this.lastY;
        this.clampViewport();
        this.requestRenderAll();
        this.lastX = e.clientX;
        this.lastY = e.clientY;
    }
});

/**
 * Evento de mouseup, efetua dragging do canvas.
 */
canvas.on('mouse:up', function () {
    this.setViewportTransform(this.viewportTransform);
    canvas.setCursor('grab');
    this.isDragging = false;
});


/**
 * Evento de mousewheel, efetua zoom do canvas.
 */
canvas.on('mouse:wheel', function (opt) {
    const e = opt.e;
    let zoom = this.getZoom();
    zoom -= Math.sign(e.deltaY) * 0.1;
    zoom = Math.max(Math.min(zoom, 3), 0.5);
    this.zoomToPoint({ x: e.offsetX, y: e.offsetY }, zoom);
    this.clampViewport();
    e.preventDefault();
    e.stopPropagation();
});

// Fim da inicialização do canvas
window.addEventListener('resize', () => canvas.updateDimensions());
canvas.updateDimensions();
canvas.centerView();

// Constantes de renderização
const CELL_HEIGHT = 34;
const COLORS = ['#8b7cdc', '#67db64', '#f65d50', '#529dc7', '#c1d85d', '#d887d9', '#53d2c8', '#ffc54b'];
const COLORS_SOFT = ['#d1cfee', '#c6ebca', '#f1c5c4', '#c0d9e7', '#e1eac7', '#e8d2ed', '#c0e8e8', '#f4e5c2'];

/**
 * Transforma o valor indicado na representação em texto apropriada
 * @param {number} value 
 */
function formatNumber(value) {
    const asString = `${value}`;
    const asInteger = parseInt(asString);
    const asFloat = value.toFixed(1);
    return asInteger == asString ? asString : asFloat;
}

/**
 * Retorna as coordenadas absolutas do objeto indicado no canvas.
 */
function getAbsolutePoint(obj, orientationX, orientationY) {
    let matrix = obj.calcTransformMatrix();
    let point = {
        x: obj.width * 0.5 * orientationX,
        y: obj.height * 0.5 * orientationY,
    };
    const abs = fabric.util.transformPoint(point, matrix);
    return [abs.x, abs.y];
}

/**
 * Renderiza uma estação de reserva no modelo de operações de load/store.
 */
function renderLoadStations(state, colormap, stationNames) {
    // Cria a tabela, com a coluna para o campo de endereços
    const table = new Table(canvas, [76, 85, 100, 100, 180], CELL_HEIGHT, stationNames.length);
    table.setColumnBorder(0, { stroke: null });
    table.setColumnText(0, { fontFamily: 'Arial Narrow, Arial, sans-serif', fontWeight: 'normal', fontSize: 22 });

    // Preenche a fila referente a cada estação
    for (let i = 0; i < stationNames.length; i++) {
        const station = state.reservation_stations[stationNames[i]];
        table.getCellText(0, i).set({ text: stationNames[i], fill: COLORS[colormap[stationNames[i]]] });

        if (!station.busy)
            continue;

        // Op
        table.getCellText(1, i).set({ text: station.getOp() });

        // Qj, Vj
        const j = station.getJValue();
        if (j === null) {
            table.getCellText(2, i).set({ text: '...' });
        } else {
            if (station.isJReady()) {
                table.getCellText(2, i).set({ text: formatNumber(j) });
            } else {
                table.getCellBorder(2, i).set({ fill: COLORS_SOFT[colormap[j]] });
                table.getCellText(2, i).set({ text: j });
            }
        }

        // Qk, Vk
        if (station.getInstructionType() === INSTRUCTION_TYPE.STORE) {
            const k = station.getKValue();
            if (k === null) {
                table.getCellText(3, i).set({ text: '...' });
            } else {
                if (station.isKReady())
                    table.getCellText(3, i).set({ text: formatNumber(k) });
                else {
                    table.getCellBorder(3, i).set({ fill: COLORS_SOFT[colormap[k]] });
                    table.getCellText(3, i).set({ text: k });
                }
            }
        }

        // A
        table.getCellText(4, i).set({ text: station.inspectAddressValue() });
    }

    return table;
}

/**
 * Renderiza uma estação de reserva no modelo de operações aritméticas.
 */
function renderArithStations(state, colormap, stationNames) {
    // Cria a tabela
    const table = new Table(canvas, [68, 85, 100, 100], CELL_HEIGHT, stationNames.length);
    table.setColumnBorder(0, { stroke: null });
    table.setColumnText(0, { fontFamily: 'Arial Narrow, Arial, sans-serif', fontWeight: 'normal', fontSize: 22 });

    // Preenche a fila referente a cada estação
    for (let i = 0; i < stationNames.length; i++) {
        const station = state.reservation_stations[stationNames[i]];
        table.getCellText(0, i).set({ text: stationNames[i], fill: COLORS[colormap[stationNames[i]]] });

        if (!station.busy)
            continue;

        // Op
        table.getCellText(1, i).set({ text: station.getOp() });

        // Qj, Vj
        const j = station.getJValue();
        if (j === null) {
            table.getCellText(2, i).set({ text: '...' });
        } else {
            if (station.isJReady()) {
                table.getCellText(2, i).set({ text: formatNumber(j) });
            } else {
                table.getCellBorder(2, i).set({ fill: COLORS_SOFT[colormap[j]] });
                table.getCellText(2, i).set({ text: j });
            }
        }

        // Qk, Vk
        const k = station.getKValue();
        if (k === null) {
            table.getCellText(3, i).set({ text: '...' });
        } else {
            if (station.isKReady()) {
                table.getCellText(3, i).set({ text: formatNumber(k) });
            } else {
                table.getCellBorder(3, i).set({ fill: COLORS_SOFT[colormap[k]] });
                table.getCellText(3, i).set({ text: k });
            }
        }
    }

    return table;
}

export function clearRender() {
    canvas.clear();
}

/**
 * Limpa o canvas atual e renderiza a visualização de um estado da simulação do algoritmo de Tomasulo.
 */
export function renderTomasuloState(state) {
    canvas.clear();

    // Associa uma cor a cada estação de reserva
    const station_names = Object.keys(state.reservation_stations);
    let colormap = {};
    for (let i = 0; i < station_names.length; i++)
        colormap[station_names[i]] = i % COLORS.length;

    // Renderiza fila de instruções
    const queues = state.program.getInstructionQueue();
    const instQueue = queues[0];
    const remQueue = queues[1];
    const instQueuePos = state.program.getInstructionQueuePos();
    const maxQueueLength = state.program.getVisibleQueueLength();
    const queueOffset = maxQueueLength - instQueue.length;
    let instructions = new Table(canvas, [281], CELL_HEIGHT, maxQueueLength, true);
    for (let i = instQueuePos; i < instQueue.length; i++) {
        const pos = instQueue.length - i - 1 + instQueuePos + queueOffset;
        instructions.getCellText(0, pos).set({ text: instQueue[i].line });
    }
    if (instQueuePos < instQueue.length) {
        for (let i = 0; i < remQueue.length; i++) {
            const pos = queueOffset - 1 - i;
            instructions.getCellText(0, pos).set({ text: remQueue[i].line, opacity: 0.45 });
        }
    }

    // Renderiza banco de registradores
    let registers = new Table(canvas, [61, 100], CELL_HEIGHT, state.register_names.length, true);
    registers.setColumnBorder(0, { stroke: null });
    registers.setColumnText(0, { fontFamily: 'Arial Narrow, Arial, sans-serif', fontWeight: 'normal', fontSize: 22 });
    for (let i = 0; i < state.register_names.length; i++) {
        let reg = state.register_names[i];
        registers.getCellText(0, i).set({ text: reg.toUpperCase() });
        reg = state.registers[reg];

        const regValue = reg.getValue();
        if (reg.busy()) {
            registers.getCellBorder(1, i).set({ fill: COLORS_SOFT[colormap[regValue]] });
            registers.getCellText(1, i).set({ text: regValue });
        } else if (regValue !== null) {
            registers.getCellText(1, i).set({ text: formatNumber(regValue) });
        }
    }

    // Renderiza estações de reserva
    let loadStations = [];
    let addStations = [];
    let multStations = [];
    for (let name in state.reservation_stations) {
        const station = state.reservation_stations[name];
        if (station.isCompatible(INSTRUCTION_TYPE.LOAD))
            loadStations.push(name);
        else if (station.isCompatible(INSTRUCTION_TYPE.ADD))
            addStations.push(name);
        else if (station.isCompatible(INSTRUCTION_TYPE.MULTIPLY))
            multStations.push(name);
    }
    let load = renderLoadStations(state, colormap, loadStations);
    let add = renderArithStations(state, colormap, addStations);
    let mult = renderArithStations(state, colormap, multStations);

    // Posiciona elementos
    const spacing = 3.25 * CELL_HEIGHT;
    const addOffset = loadStations.length * CELL_HEIGHT + spacing;
    const multOffset = addOffset + spacing + addStations.length * CELL_HEIGHT;
    const middleOffset = ((loadStations.length + addStations.length + multStations.length) * CELL_HEIGHT + 2 * spacing) * 0.5;
    instructions.set({ left: -430 - 142, top: -20 });
    registers.set({ left: -140 - 142, top: 200 });
    load.set({ top: 0 - middleOffset, left: 270 - 142 });
    add.set({ top: addOffset - middleOffset, left: 270 - 142 });
    mult.set({ top: multOffset - middleOffset, left: 270 - 142 });

    // Renderiza unidades funcionais e de memória
    let addrUnit = new Multibox(canvas, 'Address Unit', 1, 141, CELL_HEIGHT);
    let memUnit = new Multibox(canvas, 'Memory Unit', loadStations.length, 141, CELL_HEIGHT);
    let addUnit = new Multibox(canvas, 'Adder Unit', addStations.length, 121, CELL_HEIGHT);
    let multUnit = new Multibox(canvas, 'Multiplier Unit', multStations.length, 150, CELL_HEIGHT);

    // Marca unidades funcionais como ocupadas
    for (let i = 0; i < loadStations.length; i++) {
        const name = loadStations[i];
        if (state.reservation_stations[name].getFuncUnitBusy())
            memUnit.getBoxBorder(i).set({ fill: COLORS_SOFT[colormap[name]] });
    }
    for (let i = 0; i < addStations.length; i++) {
        const name = addStations[i];
        if (state.reservation_stations[name].getFuncUnitBusy())
            addUnit.getBoxBorder(i).set({ fill: COLORS_SOFT[colormap[name]] });
    }
    for (let i = 0; i < multStations.length; i++) {
        const name = multStations[i];
        if (state.reservation_stations[name].getFuncUnitBusy())
            multUnit.getBoxBorder(i).set({ fill: COLORS_SOFT[colormap[name]] });
    }

    // Posiciona elementos secundários
    const instBottom2 = getAbsolutePoint(instructions.getCellBorder(0, instructions.numRows - 1), 0.333, 1);
    addrUnit.set({ top: instBottom2[1] + 120, left: instBottom2[0] });

    let a = getAbsolutePoint(load.getCellBorder(load.numCols - 1, 0), 1, -1);
    let b = getAbsolutePoint(load.getCellBorder(load.numCols - 1, load.numRows - 1), 1, 1);
    memUnit.set({ top: b[1] + 0.5 * (a[1] - b[1]), left: 730 - 142 });

    a = getAbsolutePoint(add.getCellBorder(add.numCols - 1, 0), 1, -1);
    b = getAbsolutePoint(add.getCellBorder(add.numCols - 1, add.numRows - 1), 1, 1);
    addUnit.set({ top: b[1] + 0.5 * (a[1] - b[1]), left: 730 - 142 });

    a = getAbsolutePoint(mult.getCellBorder(mult.numCols - 1, 0), 1, -1);
    b = getAbsolutePoint(mult.getCellBorder(mult.numCols - 1, mult.numRows - 1), 1, 1);
    multUnit.set({ top: b[1] + 0.5 * (a[1] - b[1]), left: 730 - 142 });

    // Renderiza flechas
    renderLoadStationArrows(load, memUnit, addrUnit, instructions);
    renderArithStationArrows(add, addUnit, registers, true, instructions, true);
    renderArithStationArrows(mult, multUnit, registers, false, instructions, false);
    renderCDBArrows(load, add, mult, memUnit, addUnit, multUnit, registers);
}

/**
 * Gera um objeto de texto no ponto indicado.
 */
function labelPoint(text, point, fill, textAlign = 'left', originX = 'left', originY = 'bottom') {
    let label = new fabric.Text(text, {
        fontFamily: 'Arial Narrow, Arial, sans-serif',
        fontSize: 18,
        scaleY: 1.05,
        textAlign: textAlign,
        originX: originX,
        originY: originY,
        top: point[1] + (originY === 'top' ? 5 : -2),
        left: point[0] + (originX === 'left' ? 8 : -8),
        fill: fill,
        selectable: false,
        hoverCursor: 'default',
    });
    canvas.add(label);
    canvas.sendToBack(label);
    return label;
}

/**
 * Gera as linhas e flechas relativas ao CDB.
 */
function renderCDBArrows(load, add, mult, memUnit, addUnit, multUnit, registers) {
    let arrows = [];
    const spacer = CELL_HEIGHT * 1.5;
    const loadKTop = getAbsolutePoint(load.getCellBorder(3, 0), 0, -1);
    const regsTop = getAbsolutePoint(registers.getCellBorder(1, 0), 0, -1);
    const multBottom = getAbsolutePoint(mult.getCellBorder(1, mult.numRows - 1), 0, 1);
    const regsBottomLeft = getAbsolutePoint(registers.getCellBorder(1, registers.numRows - 1), -1, 1);
    const memRight = getAbsolutePoint(memUnit.getBoxBorder(memUnit.numBoxes - 1), 1, 0);

    // Registers <-> Load/Store
    arrows.push(new Arrow(canvas, [
        [loadKTop[0], loadKTop[1] - 8],
        [loadKTop[0], loadKTop[1] - spacer],
        [memRight[0] + CELL_HEIGHT, loadKTop[1] - spacer],
        [memRight[0] + CELL_HEIGHT, multBottom[1] + CELL_HEIGHT],
        [regsBottomLeft[0] - 2 * CELL_HEIGHT, multBottom[1] + CELL_HEIGHT],
        [regsBottomLeft[0] - 2 * CELL_HEIGHT, regsTop[1] - spacer],
        [regsTop[0], regsTop[1] - spacer],
        [regsTop[0], regsTop[1] - 8],
    ], 4, '#8b7cdc', 'arrow', 'arrow', 8));

    const memBottom = getAbsolutePoint(memUnit.getBoxBorder(memUnit.numBoxes - 1), 0, 1);

    // Memory Unit -> CDB
    arrows.push(new Arrow(canvas, [
        memBottom,
        [memBottom[0], memBottom[1] + CELL_HEIGHT],
        [memRight[0] + CELL_HEIGHT - 7, memBottom[1] + CELL_HEIGHT],
    ], 4, '#8b7cdc', null, 'arrow', 8));

    const addBottom = getAbsolutePoint(addUnit.getBoxBorder(addUnit.numBoxes - 1), 0, 1);

    // Adders -> CDB
    arrows.push(new Arrow(canvas, [
        addBottom,
        [addBottom[0], addBottom[1] + CELL_HEIGHT],
        [memRight[0] + CELL_HEIGHT - 7, addBottom[1] + CELL_HEIGHT],
    ], 4, '#8b7cdc', null, 'arrow', 8));

    const multUnitBottom = getAbsolutePoint(multUnit.getBoxBorder(multUnit.numBoxes - 1), 0, 1);

    // Adders -> CDB
    arrows.push(new Arrow(canvas, [
        multUnitBottom,
        [multUnitBottom[0], multBottom[1] + CELL_HEIGHT - 7],
    ], 4, '#8b7cdc', null, 'arrow', 8));

    const addLhsTop = getAbsolutePoint(add.getCellBorder(2, 0), 0, -1);
    const addRhsTop = getAbsolutePoint(add.getCellBorder(3, 0), 0, -1);

    // Add J -> Add K
    arrows.push(new Arrow(canvas, [
        [addLhsTop[0] - 1, addLhsTop[1] - 0.5 * spacer],
        [addRhsTop[0] - 1, addRhsTop[1] - 0.5 * spacer],
    ], 4, '#8b7cdc', 'circle', 'circle'));

    // Add K -> CDB
    arrows.push(new Arrow(canvas, [
        [addRhsTop[0] - 1, addRhsTop[1] - 0.5 * spacer],
        [memRight[0] + CELL_HEIGHT, addRhsTop[1] - 0.5 * spacer],
    ], 4, '#8b7cdc', 'circle', null));

    const multLhsTop = getAbsolutePoint(mult.getCellBorder(2, 0), 0, -1);
    const multRhsTop = getAbsolutePoint(mult.getCellBorder(3, 0), 0, -1);

    // Mul J -> Mul K
    arrows.push(new Arrow(canvas, [
        [multLhsTop[0] - 1, multLhsTop[1] - 0.5 * spacer],
        [multRhsTop[0] - 1, multRhsTop[1] - 0.5 * spacer],
    ], 4, '#8b7cdc', 'circle', 'circle'));

    // Mul K -> CDB
    arrows.push(new Arrow(canvas, [
        [multRhsTop[0] - 1, multRhsTop[1] - 0.5 * spacer],
        [memRight[0] + CELL_HEIGHT, multRhsTop[1] - 0.5 * spacer],
    ], 4, '#8b7cdc', 'circle', null));

    labelPoint('Common Data Bus', [regsBottomLeft[0] - 2 * CELL_HEIGHT, multBottom[1] + CELL_HEIGHT], '#8b7cdc');
}

/**
 * Gera as linhas e flechas relativas as estações de reserva de load/store.
 */
function renderLoadStationArrows(table, unit, addrUnit, instructions) {
    const spacer = CELL_HEIGHT * 0.5;
    const jBottom = getAbsolutePoint(table.getCellBorder(2, table.numRows - 1), 0, 1);
    const kBottom = getAbsolutePoint(table.getCellBorder(3, table.numRows - 1), 0, 1);

    // J -> K
    new Arrow(canvas, [
        jBottom,
        [jBottom[0], jBottom[1] + CELL_HEIGHT],
        [kBottom[0], jBottom[1] + CELL_HEIGHT],
    ], 2, '#bac2ce', null, 'circle');

    const addrBottom = getAbsolutePoint(table.getCellBorder(4, table.numRows - 1), 0, 1);
    const addrRight = getAbsolutePoint(table.getCellBorder(4, 0), 1, 0);
    const unitTop1 = getAbsolutePoint(unit.getBoxBorder(0), 0.333, -1);
    const unitTopLeft = getAbsolutePoint(unit.getBoxBorder(0), -1, -1);

    // A -> Memory Unit
    new Arrow(canvas, [
        addrBottom,
        [addrBottom[0], addrBottom[1] + spacer],
        [addrRight[0] + spacer, addrBottom[1] + spacer],
        [addrRight[0] + spacer, unitTopLeft[1] - CELL_HEIGHT],
        [unitTop1[0], unitTop1[1] - CELL_HEIGHT],
        [unitTop1[0], unitTop1[1] - 6],
    ], 2, '#bac2ce', null, 'arrow');

    const unitTop2 = getAbsolutePoint(unit.getBoxBorder(0), -0.333, -1);

    // K -> Memory Unit
    new Arrow(canvas, [
        kBottom,
        [kBottom[0], jBottom[1] + CELL_HEIGHT],
        [unitTopLeft[0] - spacer, jBottom[1] + CELL_HEIGHT],
        [unitTopLeft[0] - spacer, unitTopLeft[1] - spacer],
        [unitTop2[0], unitTop2[1] - spacer],
        [unitTop2[0], unitTop2[1] - 6],
    ], 2, '#bac2ce', null);

    const addrTop = getAbsolutePoint(table.getCellBorder(4, 0), 0, -1);
    const jTop = getAbsolutePoint(table.getCellBorder(2, 0), 0, -1);

    // J -> A
    new Arrow(canvas, [
        [addrTop[0], addrTop[1] - 6],
        [addrTop[0], addrTop[1] - CELL_HEIGHT],
        [jTop[0], jTop[1] - CELL_HEIGHT],
    ], 2, '#529dc7', 'arrow', 'circle');

    const addrUnitBottom = getAbsolutePoint(addrUnit.getBoxBorder(0), 0, 1);
    const instBottomLeft = getAbsolutePoint(instructions.getCellBorder(0, instructions.numRows - 1), 1, 1);

    // Address Unit -> J
    new Arrow(canvas, [
        addrUnitBottom,
        [addrUnitBottom[0], addrUnitBottom[1] + spacer],
        [instBottomLeft[0] + spacer, addrUnitBottom[1] + spacer],
        [instBottomLeft[0] + spacer, jTop[1] - CELL_HEIGHT],
        [jTop[0], jTop[1] - CELL_HEIGHT],
        [jTop[0], jTop[1] - 6],
    ], 2, '#529dc7', null, 'arrow');
    labelPoint('Load/Store Operations', [instBottomLeft[0] + spacer, jTop[1] - CELL_HEIGHT], '#529dc7', 'left', 'left', 'top');

    const addrUnitTop = getAbsolutePoint(addrUnit.getBoxBorder(0), 0, -1);
    const instBottom2 = getAbsolutePoint(instructions.getCellBorder(0, instructions.numRows - 1), 0.333, 1);

    // Instructions -> Address Unit
    new Arrow(canvas, [
        instBottom2,
        [addrUnitTop[0], addrUnitTop[1] - 6],
    ], 2, '#529dc7', null, 'arrow');

    const instTop = getAbsolutePoint(instructions.getCellBorder(0, 0), 0, -1);

    // -> Instructions
    new Arrow(canvas, [
        [instTop[0], instTop[1] - 76],
        [instTop[0], instTop[1] - 6],
    ], 2, '#bac2ce', null, 'arrow');
}

/**
 * Gera as linhas e flechas relativas as estações de reserva das operações aritméticas.
 */
function renderArithStationArrows(table, unit, registers, connectToRegisters = false, instructions, connectToInstructions = false) {
    const spacer = CELL_HEIGHT * 0.5;
    const lhsBottom = getAbsolutePoint(table.getCellBorder(2, table.numRows - 1), 0, 1);
    const rhsBottom = getAbsolutePoint(table.getCellBorder(3, table.numRows - 1), 0, 1);

    // J -> K
    new Arrow(canvas, [
        lhsBottom,
        [lhsBottom[0], lhsBottom[1] + spacer],
        [rhsBottom[0], lhsBottom[1] + spacer],
    ], 2, '#bac2ce', null, 'circle');

    const unitTop = getAbsolutePoint(unit.getBoxBorder(0), 0, -1);
    const unitTopLeft = getAbsolutePoint(unit.getBoxBorder(0), -1, -1);

    // K -> Functional Unit
    new Arrow(canvas, [
        rhsBottom,
        [rhsBottom[0], rhsBottom[1] + spacer],
        [unitTopLeft[0] - spacer, rhsBottom[1] + spacer],
        [unitTopLeft[0] - spacer, unitTopLeft[1] - spacer],
        [unitTop[0], unitTop[1] - spacer],
        [unitTop[0], unitTop[1] - 6],
    ], 2, '#bac2ce', null);

    const lhsTop = getAbsolutePoint(table.getCellBorder(2, 0), 0, -1);
    const rhsTop = getAbsolutePoint(table.getCellBorder(3, 0), 0, -1);

    // K -> J
    new Arrow(canvas, [
        [rhsTop[0], rhsTop[1] - 6],
        [rhsTop[0], rhsTop[1] - CELL_HEIGHT - spacer],
        [lhsTop[0], rhsTop[1] - CELL_HEIGHT - spacer],
    ], 2, '#e3ae3f', 'arrow', 'circle');

    const regBottomRight = getAbsolutePoint(registers.getCellBorder(1, registers.numRows - 1), 1, 1);
    const regBottom = getAbsolutePoint(registers.getCellBorder(1, registers.numRows - 1), 0, 1);

    // K -> Regs
    if (connectToRegisters) {
        new Arrow(canvas, [
            [lhsTop[0], lhsTop[1] - 6],
            [lhsTop[0], lhsTop[1] - CELL_HEIGHT - spacer],
            [regBottomRight[0] + spacer, lhsTop[1] - CELL_HEIGHT - spacer],
            [regBottomRight[0] + spacer, regBottomRight[1] + spacer],
            [regBottom[0], regBottomRight[1] + spacer],
            [regBottom[0], regBottom[1]],
        ], 2, '#e3ae3f', 'arrow', null);
    } else {
        new Arrow(canvas, [
            [lhsTop[0], lhsTop[1] - 6],
            [lhsTop[0], lhsTop[1] - CELL_HEIGHT - spacer],
            [regBottomRight[0] + spacer, lhsTop[1] - CELL_HEIGHT - spacer],
        ], 2, '#e3ae3f', 'arrow', 'circle');
        labelPoint('Operand\nBuses', [regBottomRight[0] + spacer, lhsTop[1] - CELL_HEIGHT - spacer], '#e3ae3f');
    }

    const nameTopLeft = getAbsolutePoint(table.getCellBorder(0, 0), -1, -1);
    const opTop = getAbsolutePoint(table.getCellBorder(1, 0), 0, -1);
    const instBottom1 = getAbsolutePoint(instructions.getCellBorder(0, instructions.numRows - 1), -0.333, 1);

    // Instructions -> Op
    if (connectToInstructions) {
        new Arrow(canvas, [
            instBottom1,
            [instBottom1[0], regBottomRight[1] + CELL_HEIGHT],
            [nameTopLeft[0] - spacer, regBottomRight[1] + CELL_HEIGHT],
            [nameTopLeft[0] - spacer, nameTopLeft[1] - spacer - 6],
            [opTop[0], opTop[1] - spacer - 6],
            [opTop[0], opTop[1] - 6],
        ], 2, '#75c373', null, 'arrow');
        labelPoint('Operation Bus', [instBottom1[0], regBottomRight[1] + CELL_HEIGHT], '#75c373');
    } else {
        new Arrow(canvas, [
            [nameTopLeft[0] - spacer, nameTopLeft[1] - spacer - 6],
            [opTop[0], opTop[1] - spacer - 6],
            [opTop[0], opTop[1] - 6],
        ], 2, '#75c373', 'circle', 'arrow');
    }
}
