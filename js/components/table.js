/**
 * Gera uma célula de objetos fabric de acordo com as configurações indicadas.
 * @param {number} width 
 * @param {number} height 
 */
function generateCell(width, height) {
    return new fabric.Group([
        // Cell border
        new fabric.Rect({
            width: width,
            height: height,
            selectable: false,
            hoverCursor: 'default',
            fill: '#eff2f5',
            stroke: '#506180',
            strokeWidth: 1,
        }),
        // Cell text
        new fabric.Text('', {
            fontFamily: 'Courier New, Courier, Lucida Sans Typewriter, Lucida Typewriter, monospace',
            fontSize: 20,
            scaleY: 1.05,
            fontWeight: 'bold',
            width: width,
            textAlign: 'center',
            originX: 'center',
            originY: 'center',
            left: 0.5 * width,
            top: 0.5 * height,
            fill: '#506180',
            selectable: false,
            hoverCursor: 'default',
        }),
    ], {
        selectable: false,
        hoverCursor: 'default',
    });
}

/**
 * Gera uma coluna de acordo com as configurações indicadas.
 * @param {number} numRows 
 * @param {number} width 
 * @param {number} height 
 */
function generateColumn(numRows, width, height) {
    let cells = [];
    for (let i = 0; i < numRows; i++) {
        let cell = generateCell(width, height);
        cell.set({
            left: 0,
            top: i * height,
        });
        cells.push(cell);
    }
    return new fabric.Group(cells, {
        selectable: false,
        hoverCursor: 'default',
    });
}

export class Table {
    
    constructor(canvas, columnWidths, rowHeight, numRows, reverse = false) {
        this.canvas = canvas;
        this.reverse = reverse;
        this.numCols = columnWidths.length;
        this.numRows = numRows;

        // Calcula posição cumulativa das colunas
        let cumulative = [0];
        for (let i = 1; i < columnWidths.length; i++)
            cumulative.push(cumulative[i - 1] + columnWidths[i - 1]);

        // Gera objetos que compoem a tabela
        let columns = [];
        for (let i = 0; i < columnWidths.length; i++) {
            const col = generateColumn(numRows, columnWidths[i], rowHeight);
            col.set({ left: cumulative[i] });
            columns.push(col);
        }
        this.table = new fabric.Group(columns, {
            left: 0,
            top: 0,
            originX: 'center',
            originY: this.reverse ? 'bottom' : 'top',
            selectable: false,
            hoverCursor: 'default',
        });

        // Adiciona tabela ao canvas
        this.canvas.add(this.table);
    }

    /**
     * Retorna o objeto fabric referente a borda da célula indicada.
     * @param {number} column 
     * @param {number} row 
     */
    getCellBorder(column, row) {
        return this.table.item(column).item(row).item(0);
    }

    /**
     * Retorna o objeto fabric referente ao texto da célula indicada.
     * @param {number} column 
     * @param {number} row 
     */
    getCellText(column, row) {
        return this.table.item(column).item(row).item(1);
    }

    /**
     * Aplica a função 'set' ao objeto fabric raiz da tabela.
     * @param {object} props 
     */
    set(props) {
        this.table.set(props);
    }

    /**
     * Aplica a função 'set' aos objetos fabric referentes a borda das células da coluna indicada.
     * @param {number} column 
     * @param {object} props 
     */
    setColumnBorder(column, props) {
        for (let i = 0; i < this.numRows; i++)
            this.getCellBorder(column, i).set(props);
    }

    /**
     * Aplica a função 'set' aos objetos fabric referentes ao texto das células da coluna indicada.
     * @param {number} column 
     * @param {object} props 
     */
    setColumnText(column, props) {
        for (let i = 0; i < this.numRows; i++)
            this.getCellText(column, i).set(props);
    }

    /**
     * Aplica a função 'set' aos objetos fabric referentes a borda das células da fila indicada.
     * @param {number} row 
     * @param {object} props 
     */
    setRowBorder(row, props) {
        for (let i = 0; i < this.numCols; i++)
            this.getCellBorder(i, row).set(props);
    }

    /**
     * Aplica a função 'set' aos objetos fabric referentes ao texto das células da fila indicada.
     * @param {number} row 
     * @param {object} props 
     */
    setRowText(row, props) {
        for (let i = 0; i < this.numCols; i++)
            this.getCellText(i, row).set(props);
    }

}
