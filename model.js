"use strict";

const ElectoralModel = (() => {
  const defaults = [
    ["Augusto Cury", 3448569, 20, 50, "candidate"],
    ["Ronaldo Caiado", 2605148, 20, 60, "candidate"],
    ["Renan Santos", 2675887, 60, 10, "candidate"],
    ["Romeu Zema", 326488, 0, 80, "candidate"],
    ["Votos nulos", 3674249, 45, 20, "invalid"],
    ["Votos brancos", 2300798, 33, 20, "invalid"]
  ];
  const first = { l: 53879538, f: 56104503, abs: 33469244 };
  const initialEntries = () => defaults.map(([name, votes, l, f, kind]) => ({ name, votes, l, f, kind }));

  // Largest remainders preserve the base, including small groups and 50/50 splits.
  function distribute(votes, lPct, fPct) {
    const exact = [lPct, fPct, 100 - lPct - fPct].map(p => votes * p / 100);
    const values = exact.map(Math.floor);
    const order = exact.map((v, i) => ({ i, fraction: v - values[i] }))
      .sort((a, b) => b.fraction - a.fraction || a.i - b.i);
    for (let i = 0, remaining = votes - values.reduce((a, b) => a + b, 0); i < remaining; i++) {
      values[order[i].i]++;
    }
    return values;
  }

  function calculate(entries, turnout) {
    let { l, f, abs } = first;
    let invalid = 0;
    const rows = [
      { name: "Votos próprios de Lula", base: first.l, l: first.l, f: 0, rest: 0, lp: 100, fp: 0, rp: 0, destination: "—" },
      { name: "Votos próprios de Flávio", base: first.f, l: 0, f: first.f, rest: 0, lp: 0, fp: 100, rp: 0, destination: "—" }
    ];
    for (const e of entries) {
      const [el, ef, rest] = distribute(e.votes, e.l, e.f);
      l += el; f += ef;
      if (e.kind === "candidate") abs += rest;
      else invalid += rest;
      rows.push({ name: e.name, base: e.votes, l: el, f: ef, rest, lp: e.l, fp: e.f, rp: 100 - e.l - e.f,
        destination: e.kind === "candidate" ? "Abstenção" : "Brancos/nulos" });
    }
    const returned = Math.round(first.abs * turnout.rate / 100);
    const [rl, rf, ri] = distribute(returned, turnout.l, turnout.f);
    l += rl; f += rf; abs -= returned; invalid += ri;
    rows.push({ name: "Retorno de ausentes", base: returned, l: rl, f: rf, rest: ri,
      lp: turnout.l, fp: turnout.f, rp: turnout.i, destination: "Brancos/nulos" });
    return { l, f, abs, invalid, rows, returned };
  }
  return { first, initialEntries, distribute, calculate };
})();
