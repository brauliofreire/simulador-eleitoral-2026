const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const model = vm.runInNewContext(fs.readFileSync('model.js', 'utf8') + '\nElectoralModel;');
const total = model.first.l + model.first.f + model.first.abs + model.initialEntries().reduce((sum, e) => sum + e.votes, 0);
function verify(result) {
  assert.equal(result.l + result.f + result.abs + result.invalid, total);
  for (const r of result.rows) {
    assert.equal(r.l + r.f + r.rest, r.base);
    assert.equal(r.lp + r.fp + r.rp, 100);
    assert.ok([r.l, r.f, r.rest].every(v => Number.isInteger(v) && v >= 0));
  }
  assert.ok(result.abs >= 0 && result.invalid >= 0);
}
const initial = model.calculate(model.initialEntries(), { rate: 0, l: 50, f: 50, i: 0 });
verify(initial);
assert.equal(initial.returned, 0);
assert.equal(initial.l, 59108489);
assert.equal(initial.f, 61115665);
assert.ok(initial.f > initial.l);
for (const rate of [0, 50, 100]) {
  for (const [l, f, i] of [[100, 0, 0], [0, 100, 0], [0, 0, 100], [50, 50, 0], [33, 33, 34]]) {
    for (const [el, ef] of [[0, 0], [100, 0], [0, 100], [50, 50]]) {
      const entries = model.initialEntries().map(e => ({ ...e, l: el, f: ef }));
      verify(model.calculate(entries, { rate, l, f, i }));
    }
  }
}
for (const votes of [0, 1, 3, 101, 33469244]) {
  for (let l = 0; l <= 100; l++) {
    for (let f = 0; f <= 100 - l; f++) {
      const distribution = model.distribute(votes, l, f);
      assert.equal(distribution.reduce((a, b) => a + b, 0), votes);
      assert.ok(distribution.every(v => Number.isInteger(v) && v >= 0));
    }
  }
}
console.log('Cálculo validado: cenário inicial, 60 cenários extremos e 25.755 distribuições.');
