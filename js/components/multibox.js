export class Multibox {

    constructor(canvas, text, numBoxes, boxWidth, boxHeight) {
        this.canvas = canvas;
        this.numBoxes = numBoxes;

        // Gera caixas de texto
        let boxes = [];
        for (let i = numBoxes - 1; i >= 0; i--) {
            const topOffset = i * 15;
            const leftOffset = i * 15;
            const border = new fabric.Rect({
                top: topOffset,
                left: leftOffset,
                width: boxWidth,
                height: boxHeight,
                fill: '#e1e5eb',
                stroke: '#bac2ce',
                strokeWidth: 1,
                selectable: false,
                hoverCursor: 'default',
            });
            const label = new fabric.Text(text, {
                fontFamily: 'Arial Narrow, Arial, sans-serif',
                fontSize: 22,
                scaleY: 1.05,
                width: boxWidth,
                textAlign: 'center',
                originX: 'center',
                originY: 'center',
                top: 0.5 * boxHeight + topOffset,
                left: 0.5 * boxWidth + leftOffset,
                fill: '#506180',
                selectable: false,
                hoverCursor: 'default',
            });
            boxes.push(new fabric.Group([border, label], {
                selectable: false,
                hoverCursor: 'default',
            }));
        }
        this.boxes = new fabric.Group(boxes, {
            top: 0,
            left: 0,
            originX: 'center',
            originY: 'center',
            selectable: false,
            hoverCursor: 'default',
        });

        // Adiciona caixas ao canvas
        this.canvas.add(this.boxes);
    }

    /**
     * Retorna o objeto fabric referente a borda da caixa indicada.
     * @param {number} box
     */
    getBoxBorder(box) {
        return this.boxes.item(this.numBoxes - box - 1).item(0);
    }

    /**
     * Aplica a função 'set' ao objeto fabric raiz das caixas.
     * @param {object} props 
     */
    set(props) {
        this.boxes.set(props);
    }

    /**
     * Retorna o objeto fabric referente ao texto da caixa indicada.
     * @param {number} box
     */
    getBoxText(box) {
        return this.boxes.item(box).item(1);
    }

}
