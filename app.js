"use strict";

const $ = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString("pt-BR");
const percent = n => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
const candidates = {
  l: { name: "Lula", photo: "assets/lula.jpg" },
  f: { name: "Flávio Bolsonaro", photo: "assets/flavio.jpg" }
};
const originPhotos = {
  "Augusto Cury": "assets/augusto-cury.jpg",
  "Ronaldo Caiado": "assets/ronaldo-caiado.jpg",
  "Renan Santos": "assets/renan-santos.jpg",
  "Romeu Zema": "assets/romeu-zema.jpg"
};
const originMemes = {
  "Votos nulos": { photo: "assets/meme-nulos.png", kind: "nulos" },
  "Votos brancos": { photo: "assets/meme-brancos.png", kind: "brancos" },
  "Retorno de ausentes": { photo: "assets/meme-ausentes.png", kind: "ausentes" }
};

const voteIcons = Object.fromEntries(Object.values(originMemes).map(icon => [icon.kind, icon]));
const voteLabels = {
  "Abstenção": ["ausentes"], "Abstenções": ["ausentes"],
  "Ausentes que retornam": ["ausentes"], "Retorno de ausentes": ["ausentes"],
  "Brancos/nulos": ["brancos", "nulos"], "Brancos ou nulos": ["brancos", "nulos"],
  "Permanecem brancos/nulos": ["brancos", "nulos"]
};
function voteIcon(kind) {
  return `<span class="meme-avatar meme-${kind}" aria-hidden="true"><img src="${voteIcons[kind].photo}" alt="" width="48" height="48" loading="lazy" decoding="async"></span>`;
}
function voteLabel(label, kinds) {
  return `<span class="vote-label"><span class="vote-icons" aria-hidden="true">${kinds.map(voteIcon).join("")}</span><span>${label}</span></span>`;
}

function originName(name, ownSide) {
  const meme = originMemes[name];
  if (meme) return voteLabel(name, [meme.kind]);
  if (voteLabels[name]) return voteLabel(name, voteLabels[name]);
  const photo = ownSide ? candidates[ownSide].photo : originPhotos[name];
  const icon = photo ? `<img class="candidate-avatar" src="${photo}" alt="" width="48" height="56" loading="lazy" decoding="async">` : "";
  return icon ? `<span class="candidate-identity">${icon}<span>${name}</span></span>` : name;
}
let entries, turnout, result;

function reset() {
  entries = ElectoralModel.initialEntries();
  turnout = { rate: 0, l: 50, f: 50, i: 0 };
  document.querySelectorAll("[data-vote-icons]").forEach(el => {
    if (!el.querySelector(".vote-label")) el.innerHTML = voteLabel(el.textContent, el.dataset.voteIcons.split(" "));
  });
  buildControls();
  calculate();
  $("status").textContent = "";
}

function slider(id, label, value, max, attrs) {
  return `<div class="control"><div class="control-heading"><label id="${id}-label" for="${id}">${originName(label)}</label><div class="slider-value"><input id="${id}-value" type="number" inputmode="decimal" min="0" max="${max}" step="any" value="${value}" data-slider="${id}" aria-labelledby="${id}-label" aria-describedby="sliderHelp"><span aria-hidden="true">%</span></div></div><div class="slider-track"><input id="${id}" type="range" min="0" max="${max}" step="any" value="${value}" aria-describedby="sliderHelp" ${attrs}><span class="slider-rail" aria-hidden="true"></span><span class="slider-thumb" data-slider="${id}" aria-hidden="true"></span></div></div>`;
}

function buildControls() {
  for (const [kind, id] of [["candidate", "candidateControls"], ["invalid", "invalidControls"]]) {
    $(id).innerHTML = entries.map((e, index) => e.kind !== kind ? "" :
      `<div class="candidate" id="entry-${index}" role="group" aria-label="Transferência de ${e.name}">
        <div class="candidate-head"><strong>${originName(e.name)}</strong><small>${fmt(e.votes)} votos</small></div>
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

function updateSlider(input, value, max = 100, min = 0) {
  input.min = min;
  input.max = max;
  input.value = value;
  const field = $(`${input.id}-value`);
  field.min = min;
  field.max = max;
  if (document.activeElement !== field) field.value = value;
  input.parentElement.style.setProperty("--position", `${max === min ? 0 : (value - min) / (max - min) * 100}%`);
  input.setAttribute("aria-valuetext", `${value}%`);
}

function updateControls() {
  entries.forEach((e, index) => {
    const group = $(`entry-${index}`);
    updateSlider($(`entry-${index}-l`), e.l);
    updateSlider($(`entry-${index}-f`), e.f);
    const remaining = 100 - e.l - e.f;
    group.querySelector(".remainder").innerHTML = `${originName(e.kind === "candidate" ? "Abstenção" : "Permanecem brancos/nulos")}: ${remaining}%`;
    setMini(group, e.l, e.f, remaining);
  });
  for (const key of ["rate", "l", "f", "i"]) {
    updateSlider($(`turnout-${key}`), turnout[key]);
  }
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
  const items = [{ name: "Votos próprios", ownSide: side, votes: own, pct: 100, note: "Mantidos da base inicial" },
    ...entries.map((e, i) => ({ name: e.name, votes: result.rows[i + 2][side], pct: e[side], note: "Da base desta origem" })),
    { name: "Retorno de ausentes", votes: result.rows.at(-1)[side], pct: turnout[side],
      note: `${turnout.rate}% retornam · ${fmt(result.returned)} eleitores` }];
  $(`${side}Breakdown`).innerHTML = items.map(item =>
    `<div class="breakdown-row"><div><span>${originName(item.name, item.ownSide)}</span><small>${item.note}</small></div><div class="breakdown-value"><strong>${item.pct}%</strong><small>${fmt(item.votes)} votos</small></div></div>`).join("") +
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
  $("rows").innerHTML = rows.map(r => `<tr><th scope="row">${originName(r.name, r.name === "Votos próprios de Lula" ? "l" : r.name === "Votos próprios de Flávio" ? "f" : undefined)}<small>Base: ${fmt(r.base)} votos</small></th>${cell(r.l, r.lp)}${cell(r.f, r.fp)}${cell(r.rest, r.rp, r.destination ? originName(r.destination) : "")}</tr>`).join("");
  $("totals").innerHTML = `<tr><th scope="row">Total do cenário</th>${cell(l, lp, "dos válidos")}${cell(f, fp, "dos válidos")}<td>${fmt(abs + invalid)}<small>${voteLabel(`${fmt(abs)} abstenções`, ["ausentes"])}</small><small>${voteLabel(`${fmt(invalid)} brancos/nulos`, ["brancos", "nulos"])}</small></td></tr>`;
  const returnText = `Retorno: ${turnout.rate}% de ${fmt(ElectoralModel.first.abs)} ausentes = ${fmt(returned)} eleitores. Distribuição entre quem retorna: ${turnout.l}% Lula, ${turnout.f}% Flávio e ${turnout.i}% brancos/nulos.`;
  $("returnDetails").innerHTML = voteLabel(returnText, ["ausentes", "brancos", "nulos"]);
  $("turnoutSummary").innerHTML = voteLabel(`${fmt(returned)} eleitores retornam neste cenário.`, ["ausentes"]);
}

function applySliderValue(el, value) {
  value = Math.max(Number(el.min), Math.min(Number(el.max), value));
  if (el.dataset.index !== undefined) {
    const e = entries[Number(el.dataset.index)], side = el.dataset.side;
    entries[Number(el.dataset.index)] = ElectoralModel.adjustTransfer(e, side, value);
  } else if (el.dataset.turnout) {
    const key = el.dataset.turnout;
    if (key === "l" || key === "f") {
      turnout = ElectoralModel.adjustTransfer(turnout, key, value);
      turnout.i = 100 - turnout.l - turnout.f;
    } else if (key === "i") {
      turnout.i = value;
      turnout.l = Math.max(0, Math.min(turnout.l, 100 - turnout.i));
      turnout.f = 100 - turnout.i - turnout.l;
    } else turnout.rate = value;
  } else return;
  // Keep the same inputs mounted so dragging and keyboard focus remain uninterrupted.
  updateControls();
  calculate();
  $("scenarioStatus").hidden = true;
}

document.addEventListener("input", ev => {
  if (ev.target.matches('input[type="range"]')) applySliderValue(ev.target, Number(ev.target.value));
});

document.addEventListener("change", ev => {
  const field = ev.target;
  if (!field.matches('.slider-value input')) return;
  const input = $(field.dataset.slider);
  if (field.value.trim() !== "" && Number.isFinite(field.valueAsNumber)) {
    applySliderValue(input, field.valueAsNumber);
  }
  field.value = input.value;
});

document.addEventListener("keydown", ev => {
  const field = ev.target;
  if (!field.matches('.slider-value input')) return;
  if (ev.key === "Enter") field.blur();
  if (ev.key === "Escape") {
    field.value = $(field.dataset.slider).value;
    field.blur();
  }
});

document.addEventListener("focusin", ev => {
  if (ev.target.matches('.slider-value input')) ev.target.select();
});

// Only the thumb starts a drag. The rest of the track remains available for scrolling.
let sliderDrag;
document.addEventListener("pointerdown", ev => {
  const thumb = ev.target.closest(".slider-thumb");
  if (!thumb || !ev.isPrimary || ev.button !== 0 || sliderDrag) return;
  const input = $(thumb.dataset.slider);
  input.focus({ preventScroll: true });
  const rail = input.parentElement.querySelector(".slider-rail").getBoundingClientRect();
  sliderDrag = { thumb, input, pointerId: ev.pointerId, x: ev.clientX, y: ev.clientY,
    value: Number(input.value), min: Number(input.min), max: Number(input.max), width: rail.width, moved: false };
  thumb.setPointerCapture(ev.pointerId);
});

document.addEventListener("pointermove", ev => {
  const drag = sliderDrag;
  if (!drag || ev.pointerId !== drag.pointerId || !drag.width) return;
  const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
  if (!drag.moved) {
    if (Math.abs(dx) < 4 || Math.abs(dx) <= Math.abs(dy)) return;
    drag.moved = true;
  }
  const value = Math.max(drag.min, Math.min(drag.max, Math.round(drag.value + dx / drag.width * (drag.max - drag.min))));
  if (value !== Number(drag.input.value)) applySliderValue(drag.input, value);
});

function finishSliderDrag(ev) {
  if (!sliderDrag || ev.pointerId !== sliderDrag.pointerId) return;
  const { thumb, pointerId } = sliderDrag;
  sliderDrag = undefined;
  if (thumb.hasPointerCapture(pointerId)) thumb.releasePointerCapture(pointerId);
}
for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
  document.addEventListener(type, finishSliderDrag);
}

const tabs = [...document.querySelectorAll('[role="tab"]')];
function activateTab(btn, focus = false) {
  tabs.forEach(b => {
    const active = b === btn;
    b.classList.toggle("active", active);
    b.setAttribute("aria-selected", String(active));
    b.tabIndex = active ? 0 : -1;
  });
  document.querySelectorAll(".tabcontent").forEach(s => { s.hidden = s.id !== btn.dataset.tab; });
  $("sliderHelp").hidden = !["transfers", "turnout"].includes(btn.dataset.tab);
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

function applyScenario(scenario, message) {
  entries = scenario.entries;
  turnout = scenario.turnout;
  updateControls();
  calculate();
  $("status").textContent = "";
  $("scenarioStatus").textContent = message;
  $("scenarioStatus").hidden = false;
}
$("firstTurn").addEventListener("click", () => {
  applyScenario(ElectoralModel.firstTurnScenario(entries),
    "Situação 1º Turno: transferências e retorno de ausentes zerados. O gráfico mostra os votos próprios dos dois candidatos; sobras seguem as regras do simulador.");
});
for (const [id, side] of [["victoryF", "f"], ["victoryL", "l"]]) {
  $(id).addEventListener("click", () => {
    applyScenario(ElectoralModel.victoryScenario(entries, turnout, side),
      `Novo cenário de vitória de ${candidates[side].name}. Transferências recalculadas a partir dos ajustes atuais; redução de 10% dos ausentes originais e transferências de 0% a 100%.`);
  });
}
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
