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
    assert.equal(generated.turnout.rate, 10);
    assert.equal(result.returned, Math.round(model.first.abs * 0.1));
    assert.ok([generated.turnout.l, generated.turnout.f].every(p => p >= 0 && p <= 100));
    assert.equal(JSON.stringify(seed), before, 'Original scenario must not mutate');
    generated.entries.forEach((e, i) => {
      assert.ok([e.l, e.f].every(p => p >= 0 && p <= 100));
    });
    const second = model.victoryScenario(generated.entries, generated.turnout, side);
    assert.notEqual(JSON.stringify(generated), before, 'Every click creates a changed scenario');
    assert.notEqual(JSON.stringify(second), JSON.stringify(generated), 'Repeated victory creates another scenario');
    const secondResult = model.calculate(second.entries, second.turnout);
    verify(secondResult);
    assert.equal(second.turnout.rate, 10);
    for (const e of second.entries) assert.ok([e.l, e.f].every(p => p >= 0 && p <= 100));
    assert.ok([second.turnout.l, second.turnout.f].every(p => p >= 0 && p <= 100));
    assert.ok(secondResult[side] > secondResult[side === 'l' ? 'f' : 'l']);
  }
}
const lulaWin = model.victoryScenario(baseEntries, seeds[0].turnout, 'l');
const flavioWin = model.victoryScenario(lulaWin.entries, lulaWin.turnout, 'f');
assert.ok(model.calculate(flavioWin.entries, flavioWin.turnout).f > model.calculate(flavioWin.entries, flavioWin.turnout).l);
console.log('Cenários rápidos validados: primeiro turno, 28 vitórias, novos cenários em cliques repetidos e alternância de vencedor.');

for (const side of ['l', 'f']) {
  const other = side === 'l' ? 'f' : 'l';
  for (const value of [-10, 0, 0.1, 1, 1.5, 2, 50, 98, 99, 99.9, 100, 110]) {
    const group = { l: 50, f: 50 };
    const adjusted = model.adjustTransfer(group, side, value);
    assert.equal(adjusted[side], Math.max(0, Math.min(100, value)));
    assert.ok(adjusted[other] >= 0 && adjusted[other] <= 100);
    assert.ok(adjusted.l + adjusted.f <= 100);
    assert.equal(group.l, 50);
    assert.equal(group.f, 50);
  }
  const ceiling = model.adjustTransfer({ l: 50, f: 50 }, side, 100);
  assert.equal(ceiling[side], 100);
  assert.equal(ceiling[other], 0);
  verify(model.calculate(baseEntries.map(e => ({ ...e, ...ceiling })), { rate: 10, ...ceiling, i: 0 }));
  const fromZero = model.adjustTransfer({ l: 0, f: 0 }, side, 0);
  assert.equal(fromZero.l, 0);
  assert.equal(fromZero.f, 0);
}
console.log('Ajustes manuais validados: percentuais de 0% a 100%, incluindo decimais, soma máxima de 100% e restante permitido em 0%.');

for (const group of [{ l: 20, f: 50 }, { l: 0, f: 0 }, { l: 100, f: 0 }, { l: 33.3, f: 66.7 }]) {
  for (const value of [-10, 0, 0.1, 37, 99.9, 100, 110]) {
    const selected = Math.max(0, Math.min(100, value));
    const adjusted = model.adjustTransfer(group, 'r', value);
    assert.ok(Math.abs(100 - adjusted.l - adjusted.f - selected) < 1e-10);
    assert.equal(adjusted.l, Math.min(group.l, 100 - selected));
    assert.ok(adjusted.l >= 0 && adjusted.f >= 0);
    const entries = baseEntries.map(e => model.adjustTransfer(e, 'r', value));
    const result = model.calculate(entries, { rate: 0, l: 50, f: 50, i: 0 });
    assert.equal(result.l + result.f + result.abs + result.invalid, total);
    const abstentions = result.rows.slice(2, 6).reduce((sum, row) => sum + row.rest, 0);
    assert.equal(result.abs, model.first.abs + abstentions);
    if (selected === 100) assert.equal(result.l + result.f, model.first.l + model.first.f);
  }
}
console.log('Abstenção ajustável validada: limites, decimais, redistribuição e conservação dos votos.');
