import { test } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) globalThis.crypto = webcrypto;
import "../../web/src/core.js";
const GF = globalThis.GF;
function memStorage() { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; }
test("integer paise conversion and Indian currency formatting", () => {
  assert.equal(GF.toPaise("1,50,000.50"), 15000050);
  assert.equal(GF.fmtINR(50000), "₹500");
  assert.equal(GF.fmtINR(15000000), "₹1,50,000");
  assert.equal(GF.fmtINR(125050, { showSign: true }), "+₹1,250.50");
  assert.equal(GF.fmtINR(50000, { hide: true }), "₹••••");
});
test("transfers never inflate income or expenses and preserve total balance", () => {
  const store = GF.createStore(memStorage()); const d = store.load(); const mk = GF.D.monthKey(GF.D.today());
  const beforeT = GF.calc.totals(d.transactions, GF.D.monthStart(mk), GF.D.monthEnd(mk)); const beforeBal = GF.calc.totalBalance(d);
  store.upsert("transactions", { id: "tx_trf_test", type: "transfer", amount: 100000, accountId: "acc_upi", toAccountId: "acc_cash", dateTime: mk + "-08T10:00", status: "CONFIRMED" });
  const afterT = GF.calc.totals(d.transactions, GF.D.monthStart(mk), GF.D.monthEnd(mk));
  assert.equal(afterT.income, beforeT.income); assert.equal(afterT.expense, beforeT.expense); assert.equal(GF.calc.totalBalance(d), beforeBal);
});
test("clearDemo removes demo records while preserving user transactions", () => {
  const store = GF.createStore(memStorage()); store.load(); assert.equal(store.hasDemo(), true);
  store.upsert("transactions", { id: "tx_real_1", type: "expense", amount: 5000, accountId: "acc_cash", categoryId: "cat_food", merchant: "Tea Stall", dateTime: GF.D.isoDT(), status: "CONFIRMED" });
  store.clearDemo(); assert.equal(store.hasDemo(), false); assert.equal(store.data.transactions.some((t) => t.id === "tx_real_1"), true);
});
test("auto-track mirroring is idempotent and excludes failed/pending/incomplete transfers", () => {
  const store = GF.createStore(memStorage()); store.load(); store.clearDemo();
  store.mirrorAuto({ id: "a1", kind: "EXPENSE", amountPaise: 5000, counterparty: "Tea Shop", appName: "Paytm", verification: "PROVISIONAL", countsInLedger: true, sources: ["UPI_APP_NOTIFICATION"] });
  store.mirrorAuto({ id: "a1", kind: "EXPENSE", amountPaise: 5000, counterparty: "Tea Shop", appName: "Paytm", verification: "CONFIRMED", countsInLedger: true, sources: ["UPI_APP_NOTIFICATION", "BANK_SMS_NOTIFICATION"] });
  assert.equal(store.data.transactions.filter((t) => t.id === "a1").length, 1);
  store.mirrorAuto({ id: "a2", kind: "EXPENSE", amountPaise: 9900, countsInLedger: false });
  store.mirrorAuto({ id: "a3", kind: "TRANSFER", amountPaise: 20000, countsInLedger: true });
  assert.equal(store.data.transactions.some((t) => t.id === "a2" || t.id === "a3"), false);
});
test("search, assistant, CSV statement parser, and AES-GCM encrypted backup work", async () => {
  const store = GF.createStore(memStorage()); const d = store.load();
  assert.ok(GF.searchTx(d, "Tea Stall").length >= 1);
  const ans = GF.assistant.answer(d, "Can I afford ₹5,000 this week?");
  assert.ok(ans && ans.data.length && ans.guidance.length);
  const rows = GF.parseStatementCsv("Date,Description,Debit,Credit,Balance\n2026-11-20,UPI/432112345678/Tea,50.00,,4150.00");
  assert.equal(rows.length, 1); assert.equal(rows[0].amountPaise, 5000); assert.equal(rows[0].ref, "432112345678");
  const enc = await GF.encryptBackup({ ok: true }, "pass1234");
  const dec = await GF.decryptBackup(enc, "pass1234");
  assert.equal(dec.ok, true);
  await assert.rejects(() => GF.decryptBackup(enc, "wrong"));
});
