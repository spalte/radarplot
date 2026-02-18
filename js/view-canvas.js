import { polarToCartesian } from './calculator.js';

const COLORS = {
    background: '#0a1929',
    grid: 'rgba(74, 144, 226, 0.2)',
    gridLabel: 'rgba(148, 184, 216, 0.6)',
    angleLabel: 'rgba(148, 184, 216, 0.8)',
    ownShip: '#00ff41',
    target: '#ffa500',
    relative: '#4a90e2',
    trueVector: '#ff3b3b',
    cpa: '#a855f7',
    white: '#ffffff',
    triangleTitle: 'rgba(148, 184, 216, 0.8)'
};

function nmToCanvas(nmX, nmY, centerX, centerY, scale, rotationDeg) {
    const c = rotationDeg * Math.PI / 180;
    const cosC = Math.cos(c);
    const sinC = Math.sin(c);
    return {
        x: centerX + (nmX * cosC - nmY * sinC) * scale,
        y: centerY - (nmY * cosC + nmX * sinC) * scale
    };
}

function bearingToCanvasOffset(bearingDeg, magnitude, pixelScale, rotationDeg) {
    const nm = polarToCartesian(bearingDeg, magnitude);
    const c = rotationDeg * Math.PI / 180;
    const cosC = Math.cos(c);
    const sinC = Math.sin(c);
    return {
        dx: (nm.x * cosC - nm.y * sinC) * pixelScale,
        dy: -(nm.y * cosC + nm.x * sinC) * pixelScale
    };
}

function drawArrowHead(ctx, fromX, fromY, toX, toY, color, size) {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - size * Math.cos(angle - Math.PI / 6), toY - size * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - size * Math.cos(angle + Math.PI / 6), toY - size * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
}

function drawGrid(ctx, centerX, centerY, maxRadius) {
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;

    for (let i = 1; i <= 4; i++) {
        const radius = (maxRadius / 4) * i;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = COLORS.gridLabel;
        ctx.font = '10px Share Tech Mono';
        ctx.textAlign = 'left';
        ctx.fillText(`${i * 5} NM`, centerX + 5, centerY - radius + 5);
    }

    for (let angle = 0; angle < 360; angle += 30) {
        const rad = angle * Math.PI / 180;
        const dx = Math.sin(rad);
        const dy = -Math.cos(rad);

        ctx.strokeStyle = COLORS.grid;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + maxRadius * dx, centerY + maxRadius * dy);
        ctx.stroke();

        const labelR = maxRadius + 20;
        ctx.fillStyle = COLORS.angleLabel;
        ctx.font = '12px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText(`${angle}\u00B0`, centerX + labelR * dx, centerY + labelR * dy);
    }
}

function drawOwnShip(ctx, centerX, centerY, maxRadius, model, rotation) {
    ctx.fillStyle = COLORS.ownShip;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
    ctx.fill();

    if (model.ownShip.speed <= 0) return;

    const vectorScale = maxRadius / 20;
    const offset = bearingToCanvasOffset(model.ownShip.course, model.ownShip.speed * 0.3, vectorScale, rotation);
    const endX = centerX + offset.dx;
    const endY = centerY + offset.dy;

    ctx.strokeStyle = COLORS.ownShip;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    drawArrowHead(ctx, centerX, centerY, endX, endY, COLORS.ownShip, 10);
}

function drawTargetPositions(ctx, centerX, centerY, scale, rotation, results) {
    const p1 = nmToCanvas(results.pos1.x, results.pos1.y, centerX, centerY, scale, rotation);
    const p2 = nmToCanvas(results.pos2.x, results.pos2.y, centerX, centerY, scale, rotation);

    ctx.fillStyle = COLORS.target;
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p2.x, p2.y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '12px Share Tech Mono';
    ctx.textAlign = 'left';
    ctx.fillText('P1', p1.x + 10, p1.y - 10);
    ctx.fillText('P2', p2.x + 10, p2.y - 10);

    ctx.strokeStyle = COLORS.target;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    drawArrowHead(ctx, p1.x, p1.y, p2.x, p2.y, COLORS.target, 10);
}

function drawCPA(ctx, centerX, centerY, scale, rotation, results) {
    if (results.relative.speed <= 0.1) return;

    const cpa = nmToCanvas(results.cpa.point.x, results.cpa.point.y, centerX, centerY, scale, rotation);

    ctx.fillStyle = COLORS.cpa;
    ctx.beginPath();
    ctx.arc(cpa.x, cpa.y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = COLORS.cpa;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(cpa.x, cpa.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = COLORS.cpa;
    ctx.font = 'bold 12px Share Tech Mono';
    ctx.textAlign = 'left';
    ctx.fillText('CPA', cpa.x + 12, cpa.y - 12);
}

function drawVelocityTriangle(ctx, centerX, canvasHeight, model, results, rotation) {
    const graphX = centerX;
    const graphY = canvasHeight - 80;

    const maxSpeed = Math.max(model.ownShip.speed, results.relative.speed, results.trueTarget.speed);
    if (maxSpeed === 0) return;

    const vScale = 70 / maxSpeed;

    const ownOff = bearingToCanvasOffset(model.ownShip.course, model.ownShip.speed, vScale, rotation);
    const ownEndX = graphX + ownOff.dx;
    const ownEndY = graphY + ownOff.dy;

    ctx.strokeStyle = COLORS.ownShip;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(graphX, graphY);
    ctx.lineTo(ownEndX, ownEndY);
    ctx.stroke();
    drawArrowHead(ctx, graphX, graphY, ownEndX, ownEndY, COLORS.ownShip, 12);

    ctx.fillStyle = COLORS.ownShip;
    ctx.font = 'bold 11px Share Tech Mono';
    ctx.textAlign = 'left';
    ctx.fillText(`${model.ownShip.speed.toFixed(1)} kts`, ownEndX + 8, ownEndY);

    const relOff = bearingToCanvasOffset(results.relative.course, results.relative.speed, vScale, rotation);
    const relEndX = ownEndX + relOff.dx;
    const relEndY = ownEndY + relOff.dy;

    ctx.strokeStyle = COLORS.relative;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(ownEndX, ownEndY);
    ctx.lineTo(relEndX, relEndY);
    ctx.stroke();
    drawArrowHead(ctx, ownEndX, ownEndY, relEndX, relEndY, COLORS.relative, 12);

    ctx.fillStyle = COLORS.relative;
    ctx.font = 'bold 11px Share Tech Mono';
    ctx.textAlign = 'left';
    const relMidX = (ownEndX + relEndX) / 2;
    const relMidY = (ownEndY + relEndY) / 2;
    ctx.fillText('Relatif', relMidX + 5, relMidY - 5);

    ctx.strokeStyle = COLORS.trueVector;
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(graphX, graphY);
    ctx.lineTo(relEndX, relEndY);
    ctx.stroke();
    ctx.setLineDash([]);
    drawArrowHead(ctx, graphX, graphY, relEndX, relEndY, COLORS.trueVector, 12);

    ctx.fillStyle = COLORS.trueVector;
    ctx.font = 'bold 11px Share Tech Mono';
    ctx.textAlign = 'right';
    ctx.fillText(`Vrai ${results.trueTarget.speed.toFixed(1)} kts`, relEndX - 8, relEndY);

    ctx.fillStyle = COLORS.white;
    ctx.beginPath();
    ctx.arc(graphX, graphY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.triangleTitle;
    ctx.font = 'bold 12px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillText('TRIANGLE DES VITESSES', centerX, canvasHeight - 120);
}

export function resizeCanvas(canvas) {
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width - 32;
    canvas.height = 600;
}

export function renderCanvas(canvas, model, results) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 40;
    const scale = maxRadius / 20;
    const rotation = model.orientationMode === 'head-up' ? model.ownShip.course : 0;

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    drawGrid(ctx, centerX, centerY, maxRadius);
    drawOwnShip(ctx, centerX, centerY, maxRadius, model, rotation);

    if (results) {
        drawTargetPositions(ctx, centerX, centerY, scale, rotation, results);
        drawCPA(ctx, centerX, centerY, scale, rotation, results);
        drawVelocityTriangle(ctx, centerX, height, model, results, rotation);
    }
}
