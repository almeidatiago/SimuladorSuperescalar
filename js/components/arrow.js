/**
 * Gera uma ponta de flecha sobre o ponto indicado.
 */
function generateArrow(headPoint, tailPoint, angle, length, strokeWidth, color) {
    const halfAngle = angle * 0.5 * (Math.PI / 180);
    const direction = Math.atan2(tailPoint[1] - headPoint[1], tailPoint[0] - headPoint[0]);
    return new fabric.Polygon([
        { x: 0, y: 0 },
        { x: Math.cos(direction + halfAngle) * length, y: Math.sin(direction + halfAngle) * length },
        { x: Math.cos(direction - halfAngle) * length, y: Math.sin(direction - halfAngle) * length },
    ], {
        top: headPoint[1] + strokeWidth * 0.5,
        left: headPoint[0] + strokeWidth * 0.5,
        originX: 'center',
        originY: 'center',
        fill: color,
        stroke: color,
        strokeWidth: strokeWidth,
        strokeLineJoin: 'round',
        selectable: false,
        hoverCursor: 'default',
    });
}

/**
 * Gera um círculo ao redor do ponto indicado.
 */
function generateCircle(headPoint, radius, strokeWidth, color) {
    return new fabric.Circle({
        top: headPoint[1] + strokeWidth * 0.5,
        left: headPoint[0] + strokeWidth * 0.5,
        originX: 'center',
        originY: 'center',
        radius: radius,
        fill: color,
        selectable: false,
        hoverCursor: 'default',
    });
}

export class Arrow {

    constructor(canvas, points, width, color, capStart = 'circle', capEnd = 'arrow', arrowLength = 6) {
        this.canvas = canvas;

        // Gera linhas
        let lines = [];
        for (let i = 1; i < points.length; i++) {
            const from = points[i - 1];
            const to = points[i];
            lines.push(new fabric.Line([from[0], from[1], to[0], to[1]], {
                fill: color,
                stroke: color,
                strokeWidth: width,
                strokeLineCap: 'round',
                selectable: false,
                hoverCursor: 'default',
            }));
        }
        this.lines = new fabric.Group(lines, {
            selectable: false,
            hoverCursor: 'default',
        });

        // Gera objetos das pontas
        if (points.length > 1 && capStart === 'arrow')
            this.capStart = generateArrow(points[0], points[1], 90, arrowLength, width, color);
        else if (capStart === 'circle')
            this.capStart = generateCircle(points[0], 4.5, width, color);
        if (points.length > 1 && capEnd === 'arrow')
            this.capEnd = generateArrow(points[points.length - 1], points[points.length - 2], 90, arrowLength, width, color);
        else if (capEnd === 'circle')
            this.capEnd = generateCircle(points[points.length - 1], 4.5, width, color);

        // Adiciona objetos ao canvas
        this.canvas.add(this.lines);
        this.canvas.sendToBack(this.lines);
        if (this.capStart) {
            this.canvas.add(this.capStart);
            this.canvas.sendToBack(this.capStart);
        }
        if (this.capEnd) {
            this.canvas.add(this.capEnd);
            this.canvas.sendToBack(this.capEnd);
        }
    }

}
