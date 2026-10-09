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

const baseEntries = model.initialEntries();
const firstTurn = model.firstTurnScenario(baseEntries);
assert.ok(firstTurn.entries.every(e => e.l === 0 && e.f === 0));
assert.equal(firstTurn.turnout.rate, 0);
const firstTurnResult = model.calculate(firstTurn.entries, firstTurn.turnout);
verify(firstTurnResult);
assert.equal(firstTurnResult.l, model.first.l);
assert.equal(firstTurnResult.f, model.first.f);
assert.equal(firstTurnResult.invalid, 3674249 + 2300798);
assert.equal(firstTurnResult.returned, 0);

const seeds = [
  { entries: baseEntries, turnout: { rate: 0, l: 50, f: 50, i: 0 } },
  firstTurn,
  ...[0, 50, 100].flatMap(rate => [[100, 0, 0], [0, 100, 0], [0, 0, 100], [50, 50, 0]].map(([l, f, i]) => ({
    entries: baseEntries.map(e => ({ ...e, l, f })), turnout: { rate, l, f, i }
  })))
];
for (const seed of seeds) {
  for (const side of ['l', 'f']) {
    const before = JSON.stringify(seed);
    const generated = model.victoryScenario(seed.entries, seed.turnout, side);
    const result = model.calculate(generated.entries, generated.turnout);
    verify(result);
    assert.ok(result[side] > result[side === 'l' ? 'f' : 'l']);
    assert.equal(generated.turnout.rate, seed.turnout.rate);
    assert.equal(JSON.stringify(seed), before, 'Original scenario must not mutate');
    generated.entries.forEach((e, i) => {
      assert.ok(e[side] >= seed.entries[i][side]);
      assert.ok(e.l + e.f <= 100);
    });
    const second = model.victoryScenario(generated.entries, generated.turnout, side);
    assert.equal(JSON.stringify(second), JSON.stringify(generated), 'Already-winning scenario stays unchanged');
  }
}
const lulaWin = model.victoryScenario(baseEntries, seeds[0].turnout, 'l');
const flavioWin = model.victoryScenario(lulaWin.entries, lulaWin.turnout, 'f');
assert.ok(model.calculate(flavioWin.entries, flavioWin.turnout).f > model.calculate(flavioWin.entries, flavioWin.turnout).l);
console.log('Cenários rápidos validados: primeiro turno, 28 vitórias, preservação dos ajustes e alternância de vencedor.');
