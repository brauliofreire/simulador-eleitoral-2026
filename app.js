"use strict";

const $ = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString("pt-BR");
const percent = n => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
const candidates = {
  l: { name: "Lula", photo: "assets/lula.jpg" },
  f: { name: "Flávio Bolsonaro", photo: "assets/flavio.jpg" }
};
let entries, turnout, result;

function reset() {
  entries = ElectoralModel.initialEntries();
  turnout = { rate: 0, l: 50, f: 50, i: 0 };
  buildControls();
  calculate();
  $("status").textContent = "";
}

function slider(id, label, value, max, attrs) {
  return `<div class="control"><label for="${id}"><span>${label}</span><strong>${value}%</strong></label><input id="${id}" type="range" min="0" max="${max}" step="1" value="${value}" ${attrs}></div>`;
}

function buildControls() {
  for (const [kind, id] of [["candidate", "candidateControls"], ["invalid", "invalidControls"]]) {
    $(id).innerHTML = entries.map((e, index) => e.kind !== kind ? "" :
      `<div class="candidate" id="entry-${index}" role="group" aria-label="Transferência de ${e.name}">
        <div class="candidate-head"><strong>${e.name}</strong><small>${fmt(e.votes)} votos</small></div>
        <div class="sliders">${slider(`entry-${index}-l`, "Lula", e.l, 100 - e.f, `data-index="${index}" data-side="l"`)}${slider(`entry-${index}-f`, "Flávio", e.f, 100 - e.l, `data-index="${index}" data-side="f"`)}</div>
        <div class="remainder"></div><div class="mini" aria-hidden="true"><i class="l"></i><i class="f"></i><i class="r"></i></div>
      </div>`).join("");
  }
  $("turnoutControls").innerHTML =
    `<div class="turnout-control">${slider("turnout-rate", "Ausentes que retornam", turnout.rate, 100, 'data-turnout="rate"')}</div>
    <div role="group" aria-label="Distribuição entre quem retorna"><div class="sliders">${slider("turnout-l", "Para Lula", turnout.l, 100, 'data-turnout="l"')}${slider("turnout-f", "Para Flávio", turnout.f, 100, 'data-turnout="f"')}</div>${slider("turnout-i", "Brancos ou nulos", turnout.i, 100, 'data-turnout="i"')}</div>
    <div class="mini" aria-hidden="true"><i class="l"></i><i class="f"></i><i class="r"></i></div><p id="turnoutSummary" class="footnote"></p>`;
  updateControls();
}

function updateSlider(input, value, max = 100) {
  input.value = value;
  input.max = max;
  input.previousElementSibling.querySelector("strong").textContent = `${value}%`;
  input.setAttribute("aria-valuetext", `${value}%`);
}

function updateControls() {
  entries.forEach((e, index) => {
    const group = $(`entry-${index}`);
    updateSlider($(`entry-${index}-l`), e.l, 100 - e.f);
    updateSlider($(`entry-${index}-f`), e.f, 100 - e.l);
    const remaining = 100 - e.l - e.f;
    group.querySelector(".remainder").textContent = `${e.kind === "candidate" ? "Abstenção" : "Permanecem brancos/nulos"}: ${remaining}%`;
    setMini(group, e.l, e.f, remaining);
  });
  for (const key of ["rate", "l", "f", "i"]) updateSlider($(`turnout-${key}`), turnout[key]);
  setMini($("turnoutControls"), turnout.l, turnout.f, turnout.i);
}

function setMini(group, l, f, rest) {
  for (const [side, value] of [["l", l], ["f", f], ["r", rest]]) {
    group.querySelector(`.mini .${side}`).style.width = `${value}%`;
  }
}

function calculate() {
  result = ElectoralModel.calculate(entries, turnout);
  render();
}

function renderBreakdown(side) {
  const own = ElectoralModel.first[side];
  const items = [{ name: "Votos próprios", votes: own, pct: 100, note: "Mantidos da base inicial" },
    ...entries.map((e, i) => ({ name: e.name, votes: result.rows[i + 2][side], pct: e[side], note: "Da base desta origem" })),
    { name: "Retorno de ausentes", votes: result.rows.at(-1)[side], pct: turnout[side],
      note: `${turnout.rate}% retornam · ${fmt(result.returned)} eleitores` }];
  $(`${side}Breakdown`).innerHTML = items.map(item =>
    `<div class="breakdown-row"><div><span>${item.name}</span><small>${item.note}</small></div><div class="breakdown-value"><strong>${item.pct}%</strong><small>${fmt(item.votes)} votos</small></div></div>`).join("") +
    `<div class="breakdown-row breakdown-total"><span>Total no cenário</span><span>${fmt(result[side])} votos</span></div>`;
}

function renderWinner(lp, fp) {
  const tie = result.l === result.f;
  $("winnerPhoto").hidden = tie;
  $("winnerLabel").textContent = tie ? "Resultado do cenário simulado" : "Presidente eleito no cenário simulado";
  $("winnerName").textContent = tie ? "Empate" : candidates[result.l > result.f ? "l" : "f"].name;
  $("winnerShare").textContent = tie ? "Nenhum candidato à frente" : `${percent(Math.max(lp, fp))} dos votos válidos`;
  if (!tie) {
    const candidate = candidates[result.l > result.f ? "l" : "f"];
    if ($("winnerPhoto").getAttribute("src") !== candidate.photo) $("winnerPhoto").src = candidate.photo;
    $("winnerPhoto").alt = `Foto de ${candidate.name}`;
  }
}

function cell(votes, pct, note = "") {
  return `<td>${fmt(votes)}<small>${percent(pct)}${note ? ` · ${note}` : ""}</small></td>`;
}

function render() {
  const { l, f, abs, invalid, rows, returned } = result;
  const valid = l + f, lp = l / valid * 100, fp = f / valid * 100;
  $("lTotal").textContent = `${fmt(l)} votos`;
  $("fTotal").textContent = `${fmt(f)} votos`;
  $("lPct").textContent = percent(lp);
  $("fPct").textContent = percent(fp);
  $("lBar").style.width = `${lp}%`;
  $("fBar").style.width = `${fp}%`;
  $("resultChart").setAttribute("aria-label", `Votos válidos simulados: Lula ${percent(lp)}; Flávio Bolsonaro ${percent(fp)}`);
  $("gap").textContent = `${fmt(Math.abs(l - f))} votos`;
  $("leader").textContent = l === f ? "Empate no cenário" : `${l > f ? "Lula" : "Flávio Bolsonaro"} à frente`;
  for (const [id, value] of [["valid", valid], ["abs", abs], ["invalid", invalid]]) $(id).textContent = fmt(value);
  $("pp").textContent = percent(Math.abs(lp - fp)).replace("%", " p.p.");
  renderWinner(lp, fp);
  renderBreakdown("l");
  renderBreakdown("f");
  const max = Math.max(l, f, 60345999, 58206354) * 1.05;
  $("comparison").innerHTML = [
    ["2022 · Lula", 60345999, "lula"], ["2022 · Jair Bolsonaro", 58206354, "flavio"],
    ["2026 · Lula (simulação)", l, "lula"], ["2026 · Flávio (simulação)", f, "flavio"]
  ].map(([name, votes, color]) => `<div class="comparison-row"><div class="comparison-head"><span>${name}</span><strong>${fmt(votes)}</strong></div><div class="track" aria-hidden="true"><i class="${color}" style="width:${votes / max * 100}%"></i></div></div>`).join("");
  $("rows").innerHTML = rows.map(r => `<tr><th scope="row">${r.name}<small>Base: ${fmt(r.base)} votos</small></th>${cell(r.l, r.lp)}${cell(r.f, r.fp)}${cell(r.rest, r.rp, r.destination)}</tr>`).join("");
  $("totals").innerHTML = `<tr><th scope="row">Total do cenário</th>${cell(l, lp, "dos válidos")}${cell(f, fp, "dos válidos")}<td>${fmt(abs + invalid)}<small>${fmt(abs)} abstenções</small><small>${fmt(invalid)} brancos/nulos</small></td></tr>`;
  const returnText = `Retorno: ${turnout.rate}% de ${fmt(ElectoralModel.first.abs)} ausentes = ${fmt(returned)} eleitores. Distribuição entre quem retorna: ${turnout.l}% Lula, ${turnout.f}% Flávio e ${turnout.i}% brancos/nulos.`;
  $("returnDetails").textContent = returnText;
  $("turnoutSummary").textContent = `${fmt(returned)} eleitores retornam neste cenário.`;
}

document.addEventListener("input", ev => {
  const el = ev.target;
  if (el.dataset.index !== undefined) {
    const e = entries[Number(el.dataset.index)], side = el.dataset.side;
    e[side] = Math.min(Number(el.value), 100 - e[side === "l" ? "f" : "l"]);
  } else if (el.dataset.turnout) {
    const key = el.dataset.turnout, value = Number(el.value);
    turnout[key] = value;
    if (key === "l") { turnout.f = Math.min(turnout.f, 100 - value); turnout.i = 100 - value - turnout.f; }
    else if (key === "f") { turnout.l = Math.min(turnout.l, 100 - value); turnout.i = 100 - value - turnout.l; }
    else if (key === "i") { turnout.l = Math.min(turnout.l, 100 - value); turnout.f = 100 - value - turnout.l; }
  } else return;
  // Keep the same inputs mounted so dragging and keyboard focus remain uninterrupted.
  updateControls();
  calculate();
});

const tabs = [...document.querySelectorAll('[role="tab"]')];
function activateTab(btn, focus = false) {
  tabs.forEach(b => {
    const active = b === btn;
    b.classList.toggle("active", active);
    b.setAttribute("aria-selected", String(active));
    b.tabIndex = active ? 0 : -1;
  });
  document.querySelectorAll(".tabcontent").forEach(s => { s.hidden = s.id !== btn.dataset.tab; });
  if (focus) btn.focus();
}
tabs.forEach((btn, index) => {
  btn.addEventListener("click", () => activateTab(btn));
  btn.addEventListener("keydown", ev => {
    let next;
    if (ev.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (ev.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (ev.key === "Home") next = 0;
    else if (ev.key === "End") next = tabs.length - 1;
    else return;
    ev.preventDefault();
    activateTab(tabs[next], true);
  });
});

$("reset").addEventListener("click", reset);
$("csv").addEventListener("click", () => {
  const data = [
    ["Cenário hipotético — segundo turno; não é previsão eleitoral"],
    ["Origem", "Base", "Lula votos", "Lula % da base", "Flávio votos", "Flávio % da base", "Restante votos", "Restante % da base", "Destino do restante"],
    ...result.rows.map(r => [r.name, r.base, r.l, r.lp, r.f, r.fp, r.rest, r.rp, r.destination]),
    ["TOTAL", "", result.l, "", result.f, "", result.abs + result.invalid, "", "Abstenções + brancos/nulos"],
    ["Abstenções totais", result.abs], ["Brancos/nulos totais", result.invalid],
    ["Retorno dos ausentes %", turnout.rate], ["Ausentes originais", ElectoralModel.first.abs],
    ["Percentual de Lula nos válidos", result.l / (result.l + result.f) * 100],
    ["Percentual de Flávio nos válidos", result.f / (result.l + result.f) * 100]
  ].map(row => row.join(";")).join("\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + data], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "simulador-eleitoral-2026.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $("status").textContent = "CSV gerado com votos e percentuais por origem.";
});
$("copy").addEventListener("click", async () => {
  const valid = result.l + result.f;
  const text = `Simulador Eleitoral 2026 — 2º turno\nLula: ${fmt(result.l)} (${percent(result.l / valid * 100)})\nFlávio Bolsonaro: ${fmt(result.f)} (${percent(result.f / valid * 100)})\nDiferença: ${fmt(Math.abs(result.l - result.f))} votos\nAbstenções: ${fmt(result.abs)}\nBrancos/nulos: ${fmt(result.invalid)}\nCenário hipotético, não é previsão eleitoral.`;
  try { await navigator.clipboard.writeText(text); $("status").textContent = "Resumo copiado."; }
  catch { $("status").textContent = "Não foi possível copiar automaticamente neste navegador."; }
});
reset();
