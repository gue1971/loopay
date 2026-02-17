const state = {
  dataFileName: "subscriptions.json",
  subscriptions: [],
  liveEdit: null,
  filters: {
    category: "all",
    tags: [],
    query: "",
  },
};

const CATEGORY_ORDER = ["生活", "娯楽", "保険", "投資"];

const el = {
  startupOverlay: document.getElementById("startupOverlay"),
  jsonFileInput: document.getElementById("jsonFileInput"),
  createNewStartBtn: document.getElementById("createNewStartBtn"),
  newBtn: document.getElementById("newBtn"),
  saveJsonBtn: document.getElementById("saveJsonBtn"),
  monthlyTotal: document.getElementById("monthlyTotal"),
  yearlyTotal: document.getElementById("yearlyTotal"),
  categoryTabs: document.getElementById("categoryTabs"),
  tableWrap: document.getElementById("tableWrap"),
  tagsPanel: document.getElementById("tagsPanel"),
  tagChips: document.getElementById("tagChips"),
  rows: document.getElementById("subscriptionRows"),
  entryModal: document.getElementById("entryModal"),
  entryForm: document.getElementById("entryForm"),
  modalTitle: document.getElementById("modalTitle"),
  entryId: document.getElementById("entryId"),
  serviceName: document.getElementById("serviceName"),
  providerName: document.getElementById("providerName"),
  category: document.getElementById("category"),
  tags: document.getElementById("tags"),
  billingCycle: document.getElementById("billingCycle"),
  billingAmount: document.getElementById("billingAmount"),
  accountIdentifier: document.getElementById("accountIdentifier"),
  paymentMethod: document.getElementById("paymentMethod"),
  notes: document.getElementById("notes"),
  costPreview: document.getElementById("costPreview"),
  modalUpdatedAt: document.getElementById("modalUpdatedAt"),
  deleteInModalBtn: document.getElementById("deleteInModalBtn"),
  cancelModalBtn: document.getElementById("cancelModalBtn"),
  viewModal: document.getElementById("viewModal"),
  viewUpdatedAt: document.getElementById("viewUpdatedAt"),
  viewServiceName: document.getElementById("viewServiceName"),
  viewProviderName: document.getElementById("viewProviderName"),
  viewCategory: document.getElementById("viewCategory"),
  viewTags: document.getElementById("viewTags"),
  viewCycle: document.getElementById("viewCycle"),
  viewAmountPerCycle: document.getElementById("viewAmountPerCycle"),
  viewMonthlyCost: document.getElementById("viewMonthlyCost"),
  viewYearlyCost: document.getElementById("viewYearlyCost"),
  viewPaymentLine: document.getElementById("viewPaymentLine"),
  viewNotesBlock: document.getElementById("viewNotesBlock"),
  viewNotes: document.getElementById("viewNotes"),
  viewCloseBtn: document.getElementById("viewCloseBtn"),
  viewEditBtn: document.getElementById("viewEditBtn"),
};

function nowIso() {
  return new Date().toISOString();
}

function formatYen(value) {
  const amount = toNumber(value);
  const isInteger = Number.isInteger(amount);
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    minimumFractionDigits: 0,
    maximumFractionDigits: isInteger ? 0 : 2,
  }).format(amount);
}

function formatRoundedYen(value) {
  return formatYen(Math.round(toNumber(value)));
}

function formatYenText(value) {
  const amount = toNumber(value);
  const isInteger = Number.isInteger(amount);
  return `${new Intl.NumberFormat("ja-JP", {
    minimumFractionDigits: 0,
    maximumFractionDigits: isInteger ? 0 : 2,
  }).format(amount)}円`;
}

function formatRoundedYenText(value) {
  return formatYenText(Math.round(toNumber(value)));
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeCycle(cycle) {
  const map = {
    monthly: "monthly",
    bimonthly: "bimonthly",
    semiannual: "semiannual",
    yearly: "yearly",
    biyearly: "biyearly",
    "1ヶ月": "monthly",
    "月額": "monthly",
    "月払い": "monthly",
    "2ヶ月": "bimonthly",
    "隔月": "bimonthly",
    "6ヶ月": "semiannual",
    "半年": "semiannual",
    "半期": "semiannual",
    "1年": "yearly",
    "年額": "yearly",
    "年払い": "yearly",
    "2年": "biyearly",
    "二年": "biyearly",
  };
  return map[cycle] || "monthly";
}

function cycleMonths(cycle) {
  const monthsByCycle = {
    monthly: 1,
    bimonthly: 2,
    semiannual: 6,
    yearly: 12,
    biyearly: 24,
  };
  return monthsByCycle[normalizeCycle(cycle)] || 1;
}

function cycleLabel(cycle) {
  const map = {
    monthly: "1ヶ月",
    bimonthly: "2ヶ月",
    semiannual: "6ヶ月",
    yearly: "1年",
    biyearly: "2年",
  };
  return map[normalizeCycle(cycle)] || "1ヶ月";
}

function normalizeCategory(categoryRaw) {
  const raw = String(categoryRaw || "").trim();
  if (!raw) return "生活";
  if (raw === "ベース" || raw === "ベース" || raw.includes("生活")) return "生活";
  if (raw.includes("娯楽")) return "娯楽";
  if (raw.includes("生命保険") || raw.includes("医療保険") || raw.includes("保険")) return "保険";
  if (raw.includes("投資")) return "投資";
  return raw;
}

function computeCosts(cycle, amountPerCycle) {
  const amount = toNumber(amountPerCycle);
  const months = cycleMonths(cycle);
  const monthlyCost = months > 0 ? amount / months : 0;
  return { monthlyCost, yearlyCost: monthlyCost * 12 };
}

function deriveAmountPerCycle(raw, cycle) {
  const direct = toNumber(raw.amountPerCycle ?? raw.billingAmount ?? raw.amount ?? 0);
  if (direct > 0) return direct;

  const monthly = toNumber(raw.monthlyCost);
  const yearly = toNumber(raw.yearlyCost);
  const months = cycleMonths(cycle);
  if (monthly > 0) return monthly * months;
  if (yearly > 0) return (yearly / 12) * months;
  return 0;
}

function normalizeEntry(raw) {
  const cycle = normalizeCycle(raw.billingCycle || raw.cycle);
  const amountPerCycle = deriveAmountPerCycle(raw, cycle);
  const costs = computeCosts(cycle, amountPerCycle);
  const createdAt = raw.createdAt || nowIso();
  return {
    id: raw.id || crypto.randomUUID(),
    serviceName: (raw.serviceName || "").trim(),
    providerName: (raw.providerName || "").trim(),
    category: normalizeCategory(raw.category),
    tags: Array.isArray(raw.tags)
      ? raw.tags.map((t) => String(t).trim()).filter(Boolean)
      : String(raw.tags || "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
    billingCycle: cycle,
    amountPerCycle,
    monthlyCost: costs.monthlyCost,
    yearlyCost: costs.yearlyCost,
    accountIdentifier: (raw.accountIdentifier || "").trim(),
    paymentMethod: (raw.paymentMethod || "").trim(),
    notes: (raw.notes || "").trim(),
    createdAt,
    updatedAt: raw.updatedAt || createdAt,
  };
}

function createNewData() {
  state.subscriptions = [];
  state.dataFileName = "subscriptions.json";
  closeStartupOverlay();
  render();
}

function closeStartupOverlay() {
  el.startupOverlay.style.display = "none";
}

function getFilteredEntries() {
  return state.subscriptions.filter((item) => {
    if (state.filters.category !== "all" && item.category !== state.filters.category) {
      return false;
    }
    if (
      state.filters.tags.length > 0 &&
      !state.filters.tags.some((selectedTag) => item.tags.includes(selectedTag))
    ) {
      return false;
    }
    if (state.filters.query) {
      const q = state.filters.query.toLowerCase();
      const target = `${item.serviceName} ${item.providerName}`.toLowerCase();
      return target.includes(q);
    }
    return true;
  });
}

function applyLiveEdit(entry) {
  if (!state.liveEdit || state.liveEdit.id !== entry.id) return entry;
  return {
    ...entry,
    billingCycle: state.liveEdit.billingCycle,
    amountPerCycle: state.liveEdit.amountPerCycle,
    monthlyCost: state.liveEdit.monthlyCost,
    yearlyCost: state.liveEdit.yearlyCost,
  };
}

function renderSummary() {
  const filtered = getFilteredEntries().map(applyLiveEdit);
  const monthly = filtered.reduce((sum, item) => sum + toNumber(item.monthlyCost), 0);
  const yearly = filtered.reduce((sum, item) => sum + toNumber(item.yearlyCost), 0);
  el.monthlyTotal.innerHTML = `<span class="summary-label">月額</span> <span class="summary-value">${formatRoundedYenText(monthly)}</span>`;
  el.yearlyTotal.innerHTML = `<span class="summary-label">年額</span> <span class="summary-value">${formatYenText(yearly)}</span>`;
}

function renderCategoryTabs() {
  const buttons = getCategoryButtons();
  el.categoryTabs.innerHTML = buttons
    .map(
      (b) =>
        `<button class="tab-btn ${state.filters.category === b.value ? "active" : ""}" data-category="${b.value}">${b.label}</button>`
    )
    .join("");
}

function getCategoryButtons() {
  const current = new Set(state.subscriptions.map((item) => item.category));
  const extras = [...current].filter((c) => !CATEGORY_ORDER.includes(c)).sort();
  const categories = [...CATEGORY_ORDER, ...extras];
  return [{ value: "all", label: "全て" }, ...categories.map((c) => ({ value: c, label: c }))];
}

function cycleCategoryBySwipe(direction) {
  const values = getCategoryButtons().map((button) => button.value);
  if (values.length === 0) return;
  let index = values.indexOf(state.filters.category);
  if (index < 0) index = 0;
  const next = (index + direction + values.length) % values.length;
  state.filters.category = values[next];
  render();
}

function renderTagChips() {
  const tagCount = new Map();
  state.subscriptions.forEach((item) => {
    item.tags.forEach((tag) => {
      tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
    });
  });
  const allTags = [...tagCount.keys()].sort((a, b) => {
    const diff = (tagCount.get(b) || 0) - (tagCount.get(a) || 0);
    return diff !== 0 ? diff : a.localeCompare(b, "ja");
  });
  state.filters.tags = state.filters.tags.filter((tag) => tagCount.has(tag));
  const isAllSelected = allTags.length > 0 && state.filters.tags.length === allTags.length;
  const chips = [
    `<button class="chip-btn ${isAllSelected ? "active" : ""}" data-tag-control="all">全て</button>`,
    `<button class="chip-btn ${state.filters.tags.length === 0 ? "active" : ""}" data-tag-control="clear">解除</button>`,
    ...allTags.map(
      (tag) =>
        `<button class="chip-btn ${state.filters.tags.includes(tag) ? "active" : ""}" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`
    ),
  ];
  el.tagChips.innerHTML = chips.join("");
}

function updateCollapsedTagChipVisibility() {
  const chips = Array.from(el.tagChips.querySelectorAll(".chip-btn"));
  chips.forEach((chip) => {
    chip.hidden = false;
  });
  if (el.tagsPanel.open) return;
  const containerRect = el.tagChips.getBoundingClientRect();
  if (containerRect.width <= 1) return;
  const maxRight = containerRect.right - 1;
  chips.forEach((chip) => {
    const rect = chip.getBoundingClientRect();
    if (rect.right > maxRight) {
      chip.hidden = true;
    }
  });
}

function renderRows() {
  const entries = getFilteredEntries().sort((a, b) => a.serviceName.localeCompare(b.serviceName, "ja"));
  el.rows.innerHTML = entries
    .map(
      (item) => {
        const display = applyLiveEdit(item);
        const tagLine = display.tags.length ? display.tags.map((tag) => `#${escapeHtml(tag)}`).join(" ") : "";
        return `
      <tr class="clickable-row" data-id="${display.id}">
        <td class="service-cell"><strong>${escapeHtml(display.serviceName)}</strong><br><small>${escapeHtml(display.providerName)}</small><br><small class="service-tags">${tagLine}</small></td>
        <td class="cost-cell">
          <div class="cost-line"><strong>${formatRoundedYenText(display.monthlyCost)}</strong></div>
          <div class="cost-line"><span>${formatYenText(display.yearlyCost)}</span></div>
        </td>
        <td class="idpay-cell"><span>${escapeHtml(display.accountIdentifier)}</span><br><small>${escapeHtml(display.paymentMethod)}</small></td>
        <td class="memo-cell">${escapeHtml(display.notes)}</td>
      </tr>`;
      }
    )
    .join("");
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ensureSelectValue(selectEl, value) {
  const selected = String(value || "");
  const hasOption = Array.from(selectEl.options).some((option) => option.value === selected);
  if (!hasOption && selected) {
    const option = document.createElement("option");
    option.value = selected;
    option.textContent = selected;
    selectEl.append(option);
  }
  selectEl.value = selected;
}

function render() {
  renderCategoryTabs();
  renderTagChips();
  renderRows();
  renderSummary();
  requestAnimationFrame(updateCollapsedTagChipVisibility);
}

function syncLiveEditFromForm() {
  const id = el.entryId.value;
  if (!id) return;
  const cycle = normalizeCycle(el.billingCycle.value);
  const amountPerCycle = toNumber(el.billingAmount.value);
  const costs = computeCosts(cycle, amountPerCycle);
  state.liveEdit = {
    id,
    billingCycle: cycle,
    amountPerCycle,
    monthlyCost: costs.monthlyCost,
    yearlyCost: costs.yearlyCost,
  };
  renderRows();
  renderSummary();
}

function updateCostPreview() {
  const cycle = normalizeCycle(el.billingCycle.value);
  const amount = toNumber(el.billingAmount.value);
  const costs = computeCosts(cycle, amount);
  el.costPreview.textContent = `月額換算: ${formatRoundedYen(costs.monthlyCost)} / 年額換算: ${formatYen(costs.yearlyCost)}`;
  syncLiveEditFromForm();
}

function openModal(editEntry = null) {
  if (editEntry) {
    el.modalTitle.textContent = "サブスク編集";
    el.modalUpdatedAt.textContent = editEntry.updatedAt
      ? `最終更新: ${new Date(editEntry.updatedAt).toLocaleDateString("ja-JP")}`
      : "";
    el.deleteInModalBtn.hidden = false;
    el.entryId.value = editEntry.id;
    el.serviceName.value = editEntry.serviceName;
    el.providerName.value = editEntry.providerName;
    ensureSelectValue(el.category, editEntry.category);
    el.tags.value = editEntry.tags.join(", ");
    el.billingCycle.value = editEntry.billingCycle;
    el.billingAmount.value = String(editEntry.amountPerCycle);
    el.accountIdentifier.value = editEntry.accountIdentifier;
    ensureSelectValue(el.paymentMethod, editEntry.paymentMethod);
    el.notes.value = editEntry.notes;
    state.liveEdit = null;
  } else {
    el.modalTitle.textContent = "サブスク登録";
    el.modalUpdatedAt.textContent = "";
    el.deleteInModalBtn.hidden = true;
    el.entryForm.reset();
    el.entryId.value = "";
    el.billingCycle.value = "monthly";
    el.category.value = "生活";
    state.liveEdit = null;
  }
  updateCostPreview();
  el.entryModal.showModal();
}

function closeModal() {
  el.entryModal.close();
}

function openViewModal(entry) {
  const display = applyLiveEdit(entry);
  el.viewUpdatedAt.textContent = display.updatedAt
    ? `最終更新: ${new Date(display.updatedAt).toLocaleDateString("ja-JP")}`
    : "";
  el.viewServiceName.textContent = display.serviceName || "未設定";
  el.viewProviderName.textContent = display.providerName || "";
  el.viewCategory.textContent = display.category || "カテゴリ未設定";
  el.viewTags.innerHTML = display.tags.length
    ? display.tags.map((tag) => `<span class="chip-btn view-tag-chip">#${escapeHtml(tag)}</span>`).join("")
    : "";
  el.viewTags.hidden = display.tags.length === 0;
  el.viewCycle.textContent = cycleLabel(display.billingCycle);
  el.viewAmountPerCycle.textContent = formatYen(display.amountPerCycle);
  el.viewMonthlyCost.textContent = formatRoundedYen(display.monthlyCost);
  el.viewYearlyCost.textContent = formatYen(display.yearlyCost);
  const paymentMethod = display.paymentMethod || "支払方法未設定";
  const accountId = display.accountIdentifier ? `ID ${display.accountIdentifier}` : "ID未設定";
  el.viewPaymentLine.textContent = `${paymentMethod} ・ ${accountId}`;
  el.viewNotes.textContent = display.notes || "";
  el.viewNotesBlock.hidden = !display.notes;
  el.viewEditBtn.dataset.id = display.id;
  el.viewModal.showModal();
}

function closeViewModal() {
  el.viewModal.close();
}

function parseLoadedData(json) {
  if (Array.isArray(json)) {
    return json.map(normalizeEntry).filter((entry) => entry.serviceName);
  }
  if (json && Array.isArray(json.subscriptions)) {
    return json.subscriptions.map(normalizeEntry).filter((entry) => entry.serviceName);
  }
  throw new Error("JSON形式が不正です。配列または subscriptions 配列を含むオブジェクトを指定してください。");
}

function handleFileLoad(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      state.subscriptions = parseLoadedData(parsed);
      state.dataFileName = file.name || "subscriptions.json";
      closeStartupOverlay();
      render();
    } catch (error) {
      alert(`読み込みに失敗しました: ${error.message}`);
    }
  };
  reader.readAsText(file, "utf-8");
}

function buildExportData() {
  return {
    schemaVersion: 1,
    exportedAt: nowIso(),
    subscriptions: state.subscriptions,
  };
}

function pad2(num) {
  return String(num).padStart(2, "0");
}

function buildDatedFileName() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = pad2(now.getMonth() + 1);
  const dd = pad2(now.getDate());
  const hh = pad2(now.getHours());
  const min = pad2(now.getMinutes());
  return `subsc${yyyy}-${mm}-${dd}-${hh}-${min}.json`;
}

function downloadJson(fileName) {
  const payload = JSON.stringify(buildExportData(), null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function setupEvents() {
  el.createNewStartBtn.addEventListener("click", createNewData);
  el.newBtn.addEventListener("click", () => {
    closeStartupOverlay();
    openModal();
  });

  el.jsonFileInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileLoad(file);
    }
  });

  el.saveJsonBtn.addEventListener("click", () => {
    downloadJson(buildDatedFileName());
  });

  el.categoryTabs.addEventListener("click", (event) => {
    const target = event.target.closest("button[data-category]");
    if (!target) return;
    const selected = target.dataset.category || "all";
    state.filters.category = state.filters.category === selected ? "all" : selected;
    render();
  });

  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  el.tableWrap.addEventListener(
    "touchstart",
    (event) => {
      if (window.innerWidth > 780) return;
      const touch = event.changedTouches?.[0];
      if (!touch) return;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartTime = Date.now();
    },
    { passive: true }
  );

  el.tableWrap.addEventListener(
    "touchend",
    (event) => {
      if (window.innerWidth > 780) return;
      const touch = event.changedTouches?.[0];
      if (!touch) return;
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      const elapsed = Date.now() - touchStartTime;
      if (Math.abs(dx) < 50) return;
      if (Math.abs(dy) > 36) return;
      if (elapsed > 650) return;
      cycleCategoryBySwipe(dx < 0 ? 1 : -1);
    },
    { passive: true }
  );

  const onTagClick = (event) => {
    const control = event.target.closest("button[data-tag-control]");
    if (control) {
      const mode = control.dataset.tagControl;
      const allTags = [...new Set(state.subscriptions.flatMap((item) => item.tags))].sort();
      state.filters.tags = mode === "all" ? allTags : [];
      render();
      return;
    }

    const target = event.target.closest("button[data-tag]");
    if (!target) return;
    const tag = target.dataset.tag || "";
    if (!tag) return;
    if (state.filters.tags.includes(tag)) {
      state.filters.tags = state.filters.tags.filter((t) => t !== tag);
    } else {
      state.filters.tags = [...state.filters.tags, tag];
    }
    render();
  };

  el.tagChips.addEventListener("click", (event) => {
    event.preventDefault();
    onTagClick(event);
  });
  el.tagsPanel.addEventListener("toggle", () => {
    requestAnimationFrame(updateCollapsedTagChipVisibility);
  });
  window.addEventListener("resize", () => {
    requestAnimationFrame(updateCollapsedTagChipVisibility);
  });

  el.rows.addEventListener("click", (event) => {
    const interactive = event.target.closest("button, a, input, select, textarea, label");
    if (interactive) return;
    const row = event.target.closest("tr[data-id]");
    if (!row) return;
    const id = row.dataset.id;
    const item = state.subscriptions.find((entry) => entry.id === id);
    if (!item) return;
    openViewModal(item);
  });

  [el.billingCycle, el.billingAmount].forEach((node) => {
    node.addEventListener("input", updateCostPreview);
    node.addEventListener("change", updateCostPreview);
  });

  el.cancelModalBtn.addEventListener("click", closeModal);
  el.viewCloseBtn.addEventListener("click", closeViewModal);
  el.viewEditBtn.addEventListener("click", () => {
    const id = el.viewEditBtn.dataset.id;
    if (!id) return;
    const item = state.subscriptions.find((entry) => entry.id === id);
    if (!item) return;
    closeViewModal();
    openModal(item);
  });
  el.deleteInModalBtn.addEventListener("click", () => {
    const id = el.entryId.value;
    if (!id) return;
    const item = state.subscriptions.find((entry) => entry.id === id);
    if (!item) return;
    if (!confirm(`${item.serviceName} を削除しますか？`)) return;
    state.subscriptions = state.subscriptions.filter((entry) => entry.id !== id);
    closeModal();
    render();
  });

  el.entryForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const id = el.entryId.value || crypto.randomUUID();
    const cycle = normalizeCycle(el.billingCycle.value);
    const amountPerCycle = toNumber(el.billingAmount.value);
    const costs = computeCosts(cycle, amountPerCycle);
    const existing = state.subscriptions.find((item) => item.id === id);
    const createdAt = existing?.createdAt || nowIso();

    const entry = {
      id,
      serviceName: el.serviceName.value.trim(),
      providerName: el.providerName.value.trim(),
      category: normalizeCategory(el.category.value),
      tags: el.tags.value
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      billingCycle: cycle,
      amountPerCycle,
      monthlyCost: costs.monthlyCost,
      yearlyCost: costs.yearlyCost,
      accountIdentifier: el.accountIdentifier.value.trim(),
      paymentMethod: el.paymentMethod.value.trim(),
      notes: el.notes.value.trim(),
      createdAt,
      updatedAt: nowIso(),
    };

    if (existing) {
      state.subscriptions = state.subscriptions.map((item) => (item.id === id ? entry : item));
    } else {
      state.subscriptions.push(entry);
    }

    state.liveEdit = null;
    closeModal();
    render();
  });

  el.entryModal.addEventListener("close", () => {
    if (state.liveEdit) {
      state.liveEdit = null;
      renderRows();
      renderSummary();
    }
  });
}

function setupPwa() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // no-op: app works without offline cache
    });
  });
}

setupEvents();
setupPwa();
render();
