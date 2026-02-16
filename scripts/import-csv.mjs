import fs from 'node:fs';
import path from 'node:path';

const inputFiles = process.argv.slice(2);
if (inputFiles.length === 0) {
  console.error('Usage: node scripts/import-csv.mjs <csv...>');
  process.exit(1);
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function parseCurrency(value) {
  if (!value) return 0;
  const n = Number(String(value).replace(/[¥,\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function normalizeCycle(raw) {
  const s = String(raw || '').trim();
  if (s.includes('年') && !s.includes('二')) return 'yearly';
  if (s.includes('二年') || s.includes('2年')) return 'biyearly';
  if (s.includes('二月') || s.includes('2月')) return 'bimonthly';
  return 'monthly';
}

function toMonthlyYearly(cycle, monthlyCell, yearlyCell) {
  const monthly = parseCurrency(monthlyCell);
  const yearly = parseCurrency(yearlyCell);

  if (monthly > 0 && yearly > 0) return { monthlyCost: monthly, yearlyCost: yearly, amountPerCycle: cycle === 'yearly' ? yearly : cycle === 'biyearly' ? yearly * 2 : monthly };
  if (monthly > 0) {
    if (cycle === 'yearly') return { monthlyCost: monthly, yearlyCost: monthly * 12, amountPerCycle: monthly * 12 };
    if (cycle === 'biyearly') return { monthlyCost: monthly, yearlyCost: monthly * 12, amountPerCycle: monthly * 24 };
    if (cycle === 'bimonthly') return { monthlyCost: monthly, yearlyCost: monthly * 12, amountPerCycle: monthly * 2 };
    return { monthlyCost: monthly, yearlyCost: monthly * 12, amountPerCycle: monthly };
  }
  if (yearly > 0) {
    if (cycle === 'biyearly') return { monthlyCost: yearly / 12, yearlyCost: yearly, amountPerCycle: yearly * 2 };
    return { monthlyCost: yearly / 12, yearlyCost: yearly, amountPerCycle: yearly };
  }
  return { monthlyCost: 0, yearlyCost: 0, amountPerCycle: 0 };
}

function isCanceled(row) {
  const text = row.join(' ').toLowerCase();
  const keys = ['解約', '退会', '停止済み', '自動継続停止'];
  return keys.some((k) => text.includes(k));
}

function isSummary(name) {
  return !name || name.startsWith('合計');
}

function categoryFromFile(file) {
  const base = path.basename(file, '.csv');
  return base.replace('シート1-', '');
}

const results = [];
for (const file of inputFiles) {
  const category = categoryFromFile(file);
  const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) continue;

  for (let i = 1; i < lines.length; i += 1) {
    const row = parseCsvLine(lines[i]);
    const serviceName = (row[0] || '').trim();
    if (isSummary(serviceName) || isCanceled(row)) continue;

    const providerName = (row[1] || '').trim();
    const cycleRaw = row[2] || '';
    const monthlyCell = row[3] || '';
    const yearlyCell = row[4] || '';

    const cycleNormalized = normalizeCycle(cycleRaw);
    const costs = toMonthlyYearly(cycleNormalized, monthlyCell, yearlyCell);

    if (costs.monthlyCost <= 0 && costs.yearlyCost <= 0) continue;

    const billingCycle = cycleNormalized === 'bimonthly' ? 'monthly' : cycleNormalized;

    results.push({
      id: `seed-${results.length + 1}`,
      serviceName,
      providerName,
      category,
      tags: [category],
      billingCycle,
      amountPerCycle: Math.round(costs.amountPerCycle),
      monthlyCost: Math.round(costs.monthlyCost),
      yearlyCost: Math.round(costs.yearlyCost),
      accountIdentifier: (row[5] || '').trim(),
      paymentMethod: (row[7] || '').trim(),
      notes: [row[8], row[9]].map((s) => (s || '').trim()).filter(Boolean).join(' | '),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

const out = {
  schemaVersion: 1,
  exportedAt: new Date().toISOString(),
  subscriptions: results,
};

fs.writeFileSync('data/subscriptions-from-csv.json', JSON.stringify(out, null, 2));
console.log(`created data/subscriptions-from-csv.json (${results.length} items)`);
