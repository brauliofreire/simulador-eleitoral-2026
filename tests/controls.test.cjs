const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Exercise the application's event handlers without a browser or external dependencies.
const listeners = new Map();
const nodes = new Map();
const document = {
  activeElement: null,
  getElementById(id) {
    if (!nodes.has(id)) nodes.set(id, {
      id, value: '', dataset: {}, style: { setProperty() {} },
      setAttribute() {}, addEventListener() {},
      querySelector(selector) { return document.getElementById(`${id}:${selector}`); }
    });
    return nodes.get(id);
  },
  querySelectorAll() { return []; },
  addEventListener(type, callback) {
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type).push(callback);
  }
};
const context = vm.createContext({ document, console, setTimeout });
vm.runInContext(fs.readFileSync('model.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('app.js', 'utf8').replace(/reset\(\);\s*$/, ''), context);
vm.runInContext('entries = ElectoralModel.initialEntries(); turnout = {rate: 0, l: 50, f: 50, i: 0}; calculate = () => {};', context);
const ids = Array.from({ length: 6 }, (_, i) => [`entry-${i}-l`, `entry-${i}-f`]).flat()
  .concat(['turnout-rate', 'turnout-l', 'turnout-f', 'turnout-i']);
const emit = (type, target, props = {}) => {
  for (const callback of listeners.get(type) || []) callback({ target, ...props });
};
for (const id of ids) {
  const range = document.getElementById(id);
  for (const input of [range, document.getElementById(`${id}-value`)]) {
    let value = '';
    Object.defineProperty(input, 'value', { get: () => value, set: next => { value = String(next); } });
  }
  range.dataset = id.startsWith('entry-')
    ? { index: id.split('-')[1], side: id.split('-')[2] }
    : { turnout: id.slice(8) };
  range.parentElement = document.getElementById(`${id}-track`);
  range.parentElement.querySelector('.slider-rail').getBoundingClientRect = () => ({ width: 200 });
  range.matches = selector => selector === 'input[type="range"]';
  range.focus = () => { document.activeElement = range; };
  const field = document.getElementById(`${id}-value`);
  field.dataset = { slider: id };
  field.matches = selector => selector === '.slider-value input';
  Object.defineProperty(field, 'valueAsNumber', { get: () => field.value === '' ? NaN : Number(field.value) });
  field.blur = () => { document.activeElement = null; emit('change', field); };
  field.select = () => { field.selected = true; };
}
vm.runInContext('updateControls();', context);
for (const id of ids) {
  const range = nodes.get(id), field = nodes.get(`${id}-value`);
  let captured = false;
  const thumb = {
    dataset: { slider: id }, closest: () => thumb,
    setPointerCapture: () => { captured = true; },
    hasPointerCapture: () => captured, releasePointerCapture: () => { captured = false; }
  };
  const down = target => emit('pointerdown', target, { isPrimary: true, button: 0, pointerId: 1, clientX: 100, clientY: 100 });
  const move = (x, y = 100) => emit('pointermove', thumb, { pointerId: 1, clientX: x, clientY: y });
  const start = Number(range.value);
  down({ closest: () => null });
  move(200);
  assert.equal(Number(range.value), start, `${id}: track does not change value`);
  down(thumb);
  emit('pointerup', thumb, { pointerId: 1 });
  assert.equal(Number(range.value), start, `${id}: thumb tap does not change value`);
  down(thumb);
  move(102, 140);
  emit('pointercancel', thumb, { pointerId: 1 });
  move(200);
  assert.equal(Number(range.value), start, `${id}: vertical scroll and cancelled drag do not change value`);
  down(thumb);
  move(start > 50 ? 70 : 130);
  emit('pointerup', thumb, { pointerId: 1 });
  assert.notEqual(Number(range.value), start, `${id}: horizontal drag changes value`);
  assert.equal(captured, false);
  const beforeTyping = Number(range.value);
  field.value = '7';
  emit('input', field);
  assert.equal(Number(range.value), beforeTyping, `${id}: typing is not prematurely applied`);
  field.value = '37';
  emit('keydown', field, { key: 'Enter' });
  assert.equal(Number(range.value), 37, `${id}: Enter commits the complete number`);
  for (const value of [0, 0.1, 1.5, 99, 99.9, 100]) {
    field.value = String(value);
    emit('change', field);
    assert.equal(Number(range.value), value, `${id}: unrestricted percentage ${value}`);
  }
  field.value = '999';
  emit('change', field);
  assert.equal(Number(range.value), Number(range.max), `${id}: values respect maximum`);
  field.value = '';
  emit('change', field);
  assert.equal(Number(field.value), Number(range.value), `${id}: empty edit restores current value`);
  const beforeEscape = Number(range.value);
  field.value = '12';
  emit('keydown', field, { key: 'Escape' });
  assert.equal(Number(range.value), beforeEscape, `${id}: Escape cancels edit`);
  range.value = '40';
  emit('input', range);
  assert.equal(Number(range.value), 40, `${id}: native keyboard input remains supported`);
}
console.log(`Controles validados: ${ids.length} deslizantes, linha inativa, arraste horizontal, scroll vertical, cancelamento, digitação, limites e teclado.`);
