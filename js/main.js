import { createModel } from './model.js';
import { displayToTrue } from './bearings.js';
import { computeResults } from './calculator.js';
import { renderForm } from './view-form.js';
import { renderCanvas, resizeCanvas } from './view-canvas.js';

const model = createModel();
const canvas = document.getElementById('radarCanvas');

function render() {
    const results = computeResults(model.currentTarget, model.ownShip);
    renderForm(model, results);
    renderCanvas(canvas, model, results);
}

model.subscribe(render);

function bindInput(id, handler) {
    document.getElementById(id).addEventListener('input', handler);
}

bindInput('ownCourse', (e) => model.setOwnCourse(parseFloat(e.target.value) || 0));
bindInput('ownSpeed', (e) => model.setOwnSpeed(parseFloat(e.target.value) || 0));

bindInput('bearing1', (e) => {
    const display = parseFloat(e.target.value) || 0;
    model.updateCurrentTarget('bearing1', displayToTrue(display, model.ownShip.course, model.orientationMode));
});

bindInput('bearing2', (e) => {
    const display = parseFloat(e.target.value) || 0;
    model.updateCurrentTarget('bearing2', displayToTrue(display, model.ownShip.course, model.orientationMode));
});

bindInput('distance1', (e) => model.updateCurrentTarget('distance1', parseFloat(e.target.value) || 0));
bindInput('distance2', (e) => model.updateCurrentTarget('distance2', parseFloat(e.target.value) || 0));
bindInput('time1', (e) => model.updateCurrentTarget('time1', e.target.value));
bindInput('time2', (e) => model.updateCurrentTarget('time2', e.target.value));

document.getElementById('northUpBtn').addEventListener('click', () => model.setOrientationMode('north-up'));
document.getElementById('headUpBtn').addEventListener('click', () => model.setOrientationMode('head-up'));

document.querySelectorAll('.target-btn').forEach((btn, i) => {
    btn.addEventListener('click', () => model.selectTarget(i));
});

function handleResize() {
    resizeCanvas(canvas);
    render();
}

window.addEventListener('resize', handleResize);

window.addEventListener('load', () => {
    resizeCanvas(canvas);
    model.notify();
});
