(function (root) {
  const GF = (root.GF = root.GF || {});
  GF.KEY = "glassfinance.v2";
  const DEFAULT_CATEGORIES = [
    { id: "cat_salary", name: "Salary", type: "income", icon: "💼", system: true },
    { id: "cat_freelance", name: "Freelance", type: "income", icon: "🧑‍💻", system: true },
    { id: "cat_business", name: "Business", type: "income", icon: "🏢", system: true },
    { id: "cat_allowance", name: "Allowance", type: "income", icon: "🎁", system: true },
    { id: "cat_interest", name: "Interest", type: "income", icon: "🏦", system: true },
    { id: "cat_refund", name: "Refund", type: "income", icon: "↩️", system: true },
    { id: "cat_received", name: "Money received", type: "income", icon: "📲", system: true },
    { id: "cat_inc_other", name: "Other", type: "income", icon: "✨", system: true },
    { id: "cat_food", name: "Food", type: "expense", icon: "🍽️", system: true },
    { id: "cat_transport", name: "Transport", type: "expense", icon: "⛽", system: true },
    { id: "cat_education", name: "Education", type: "expense", icon: "🎓", system: true },
    { id: "cat_shopping", name: "Shopping", type: "expense", icon: "🛍️", system: true },
    { id: "cat_entertainment", name: "Entertainment", type: "expense", icon: "🎬", system: true },
    { id: "cat_bills", name: "Bills", type: "expense", icon: "⚡", system: true },
    { id: "cat_health", name: "Health", type: "expense", icon: "🏥", system: true },
    { id: "cat_travel", name: "Travel", type: "expense", icon: "✈️", system: true },
    { id: "cat_subscriptions", name: "Subscriptions", type: "expense", icon: "🔁", system: true },
    { id: "cat_groceries", name: "Groceries", type: "expense", icon: "🛒", system: true },
    { id: "cat_other", name: "Other", type: "expense", icon: "📦", system: true },
  ];
  GF.toPaise = (val) => {
    if (typeof val === "number" && Number.isFinite(val)) return Math.round(val * 100);
    const clean = String(val ?? "").replace(/[₹,\s]/g, "");
    if (!clean || !/^-?\d+(\.\d+)?$/.test(clean)) return 0;
    const neg = clean.startsWith("-"); const [r, p = ""] = clean.replace("-", "").split(".");
    const out = Number(r) * 100 + Number((p + "00").slice(0, 2)); return neg ? -out : out;
  };
  GF.fromPaise = (p) => ((Number(p) || 0) / 100).toFixed(2);
  GF.fmtINR = (paise, { showSign = false, hide = false } = {}) => {
    if (hide) return "₹••••";
    const n = Math.trunc(Number(paise) || 0); const abs = Math.abs(n) / 100;
    const formatted = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: n % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(abs);
    if (n < 0) return "-" + formatted; if (showSign && n > 0) return "+" + formatted; return formatted;
  };
  GF.D = {
    today: (d = new Date()) => d.toISOString().slice(0, 10),
    isoDT: (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    monthKey: (s) => String(s || GF.D.today()).slice(0, 7),
    monthStart: (mk) => mk + "-01",
    monthEnd: (mk) => { const [y, m] = mk.split("-").map(Number); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); },
    addDays: (iso, days) => { const d = new Date(iso.slice(0, 10) + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); },
    addMonths: (mk, delta) => { const [y, m] = mk.split("-").map(Number); return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7); },
    short: (iso) => new Date(iso.slice(0, 10) + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
  };
  GF.uid = (p = "id") => p + "_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  GF.emptyData = () => ({
    schema: 1,
    settings: { theme: "system", currency: "INR", hideBalances: false, pinHash: null, biometricEnabled: true, autoTrack: true, autoCategorize: true, trackBankSms: true, defaultAccountId: "acc_upi", overallBudget: 2500000 },
    meta: { createdAt: new Date().toISOString(), savedAt: new Date().toISOString(), demoSeeded: false },
    accounts: [{ id: "acc_cash", name: "Cash", type: "cash", bankName: "", opening: 0, currency: "INR", icon: "💵" }, { id: "acc_upi", name: "UPI / Primary Bank", type: "upi", bankName: "SBI", opening: 0, currency: "INR", icon: "📲" }],
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })), transactions: [], budgets: [], goals: [], recurring: [], bills: [],
  });
  GF.seedDemo = (d) => {
    const mk = GF.D.monthKey(GF.D.today()), prev = GF.D.addMonths(mk, -1); d.meta.demoSeeded = true;
    d.accounts = [
      { id: "acc_cash", name: "Cash Wallet", type: "cash", bankName: "", opening: 350000, currency: "INR", icon: "💵", isDemo: true },
      { id: "acc_upi", name: "SBI Savings (UPI)", type: "bank", bankName: "SBI", opening: 4200000, currency: "INR", icon: "🏦", isDemo: true },
      { id: "acc_save", name: "Emergency Savings", type: "savings", bankName: "HDFC Bank", opening: 3500000, currency: "INR", icon: "🛡️", isDemo: true },
    ];
    d.transactions = [
      { id: "demo_1", type: "income", amount: 4500000, accountId: "acc_upi", categoryId: "cat_salary", merchant: "Monthly Salary", dateTime: mk + "-01T10:00", paymentMethod: "Bank Transfer", status: "CONFIRMED", source: "DEMO", isDemo: true },
      { id: "demo_2", type: "expense", amount: 5000, accountId: "acc_upi", categoryId: "cat_food", merchant: "Sri Sai Tea Stall", dateTime: mk + "-03T08:30", paymentMethod: "Paytm UPI", ref: "432112345678", status: "CONFIRMED", source: "UPI_NOTIFICATION", isDemo: true },
      { id: "demo_3", type: "expense", amount: 15000, accountId: "acc_upi", categoryId: "cat_transport", merchant: "HP Petrol Pump", dateTime: mk + "-04T18:10", paymentMethod: "Google Pay", ref: "432198765432", status: "PROVISIONAL", source: "UPI_NOTIFICATION", isDemo: true },
      { id: "demo_4", type: "expense", amount: 185000, accountId: "acc_upi", categoryId: "cat_groceries", merchant: "Ratnadeep Supermarket", dateTime: mk + "-06T19:45", paymentMethod: "PhonePe", status: "BANK_VERIFIED", source: "BANK_SMS", isDemo: true },
      { id: "demo_5", type: "transfer", amount: 500000, accountId: "acc_upi", toAccountId: "acc_save", categoryId: null, merchant: "Goal Transfer", dateTime: mk + "-07T11:00", paymentMethod: "UPI", status: "CONFIRMED", source: "MANUAL", isDemo: true },
      { id: "demo_6", type: "income", amount: 3500000, accountId: "acc_upi", categoryId: "cat_salary", merchant: "Monthly Salary", dateTime: prev + "-01T10:00", paymentMethod: "Bank Transfer", status: "BANK_VERIFIED", source: "DEMO", isDemo: true },
      { id: "demo_7", type: "expense", amount: 120000, accountId: "acc_upi", categoryId: "cat_bills", merchant: "APSPDCL Electricity", dateTime: prev + "-10T14:20", paymentMethod: "BHIM", status: "CONFIRMED", source: "DEMO", isDemo: true },
    ];
    d.budgets = [{ id: "bud_food", categoryId: "cat_food", month: mk, limit: 500000, isDemo: true }, { id: "bud_trans", categoryId: "cat_transport", month: mk, limit: 200000, isDemo: true }, { id: "bud_shop", categoryId: "cat_shopping", month: mk, limit: 300000, isDemo: true }];
    d.goals = [{ id: "goal_laptop", name: "New Laptop", target: 8000000, saved: 3500000, targetDate: GF.D.addDays(GF.D.today(), 180), isDemo: true }];
    d.bills = [{ id: "bill_net", name: "ACT Fibernet", amount: 89900, dueDate: GF.D.addDays(GF.D.today(), 3), categoryId: "cat_bills", accountId: "acc_upi", recurrence: "monthly", paid: false, isDemo: true }];
    d.recurring = [{ id: "rec_sal", name: "Salary", type: "income", amount: 4500000, frequency: "monthly", nextDate: GF.D.addMonths(mk, 1) + "-01", categoryId: "cat_salary", accountId: "acc_upi", isDemo: true }];
    return d;
  };
  GF.calc = {
    inRange(tx, from, to) { const dt = String(tx.dateTime || "").slice(0, 10); if (from && dt < from) return false; if (to && dt > to) return false; return true; },
    accountBalance(acc, txs) {
      let bal = Number(acc.opening) || 0;
      for (const t of txs) {
        if (t.status === "FAILED" || t.status === "PENDING" || t.status === "REVERSED") continue;
        const amt = Number(t.amount) || 0;
        if (t.type === "income" && t.accountId === acc.id) bal += amt;
        else if (t.type === "expense" && t.accountId === acc.id) bal -= amt;
        else if (t.type === "transfer") { if (t.accountId === acc.id) bal -= amt; if (t.toAccountId === acc.id) bal += amt; }
      }
      return bal;
    },
    totalBalance: (data) => data.accounts.reduce((s, a) => s + GF.calc.accountBalance(a, data.transactions), 0),
    totals(txs, from, to) {
      let income = 0, expense = 0;
      for (const t of txs) {
        if (!GF.calc.inRange(t, from, to)) continue;
        if (t.status === "FAILED" || t.status === "PENDING" || t.status === "REVERSED") continue;
        if (t.type === "income") income += Number(t.amount) || 0;
        else if (t.type === "expense") expense += Number(t.amount) || 0;
      }
      const savings = income - expense; const rate = income > 0 ? Math.round((savings / income) * 100) : 0;
      return { income, expense, savings, rate };
    },
    byCategory(txs, from, to, type = "expense") {
      const map = new Map();
      for (const t of txs) {
        if (t.type !== type || !GF.calc.inRange(t, from, to) || t.status === "FAILED" || t.status === "PENDING" || t.status === "REVERSED") continue;
        const k = t.categoryId || "cat_other"; map.set(k, (map.get(k) || 0) + (Number(t.amount) || 0));
      }
      return [...map.entries()].map(([categoryId, amount]) => ({ categoryId, amount })).sort((a, b) => b.amount - a.amount);
    },
    budgetState(budget, txs) {
      const from = GF.D.monthStart(budget.month), to = GF.D.monthEnd(budget.month); let spent = 0;
      for (const t of txs) {
        if (t.type !== "expense" || t.categoryId !== budget.categoryId || !GF.calc.inRange(t, from, to) || t.status === "FAILED" || t.status === "PENDING" || t.status === "REVERSED") continue;
        spent += Number(t.amount) || 0;
      }
      const pct = budget.limit > 0 ? Math.round((spent / budget.limit) * 100) : 0;
      return { spent, limit: budget.limit, remaining: budget.limit - spent, pct, state: pct > 100 ? "over" : pct >= 80 ? "warning" : "ok" };
    },
    goalProgress: (g) => ({ saved: g.saved, target: g.target, remaining: Math.max(0, g.target - g.saved), pct: g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0 }),
    billStatus: (bill, today = GF.D.today()) => bill.paid ? "paid" : bill.dueDate < today ? "overdue" : bill.dueDate === today ? "due" : "upcoming",
    insights(data) {
      const mk = GF.D.monthKey(GF.D.today()), prev = GF.D.addMonths(mk, -1);
      const curT = GF.calc.totals(data.transactions, GF.D.monthStart(mk), GF.D.monthEnd(mk));
      const prevT = GF.calc.totals(data.transactions, GF.D.monthStart(prev), GF.D.monthEnd(prev));
      const out = [];
      if (prevT.expense > 0 && curT.expense > 0) { const diff = Math.round(((curT.expense - prevT.expense) / prevT.expense) * 100); if (diff !== 0) out.push(`Your spending ${diff > 0 ? "increased" : "decreased"} ${Math.abs(diff)}% compared to last month.`); }
      const top = GF.calc.byCategory(data.transactions, GF.D.monthStart(mk), GF.D.monthEnd(mk))[0];
      if (top) out.push(`${data.categories.find((c) => c.id === top.categoryId)?.name || "Other"} is your highest expense category this month (${GF.fmtINR(top.amount)}).`);
      if (curT.income > 0) out.push(`You saved ${curT.rate}% of your income this month (${GF.fmtINR(curT.savings)}).`);
      const ob = data.settings.overallBudget || 0;
      if (ob > 0) { const rem = ob - curT.expense; out.push(rem >= 0 ? `You are ${GF.fmtINR(rem)} under your monthly budget.` : `You exceeded your monthly budget by ${GF.fmtINR(-rem)}.`); }
      return out;
    },
  };
  GF.searchTx = (data, query) => {
    const q = String(query || "").trim().toLowerCase(); if (!q) return data.transactions;
    return data.transactions.filter((t) => {
      const cat = data.categories.find((c) => c.id === t.categoryId)?.name || "", acc = data.accounts.find((a) => a.id === t.accountId)?.name || "", amt = GF.fmtINR(t.amount).toLowerCase();
      return [t.merchant, t.note, cat, acc, t.dateTime, t.paymentMethod, t.ref, amt].some((f) => String(f || "").toLowerCase().includes(q));
    });
  };
  GF.assistant = {
    answer(data, query) {
      const q = String(query || "").trim().toLowerCase(), mk = GF.D.monthKey(GF.D.today()), prev = GF.D.addMonths(mk, -1);
      const cur = GF.calc.totals(data.transactions, GF.D.monthStart(mk), GF.D.monthEnd(mk)), prv = GF.calc.totals(data.transactions, GF.D.monthStart(prev), GF.D.monthEnd(prev));
      if (/spend.*this month|spent.*this month/.test(q)) return { data: [`You spent ${GF.fmtINR(cur.expense)} this month.`] };
      if (/biggest expense|largest expense/.test(q)) { const big = data.transactions.filter((t) => t.type === "expense").sort((a, b) => b.amount - a.amount)[0]; return big ? { data: [`Your biggest expense is ${GF.fmtINR(big.amount)} at ${big.merchant || "Unknown"}.`] } : { data: ["No expenses recorded yet."] }; }
      if (/save.*last month|saved.*last month/.test(q)) return { data: [`Last month you saved ${GF.fmtINR(prv.savings)}.`] };
      if (/afford/.test(q)) { const m = q.match(/([0-9][0-9,]*)/); const ask = m ? GF.toPaise(m[1]) : 0; const rem = (data.settings.overallBudget || 0) - cur.expense; return { data: [`Remaining monthly budget: ${GF.fmtINR(rem)}.`], guidance: [rem >= ask ? "General guidance: This fits within your remaining monthly budget." : "General guidance: This would exceed your remaining monthly budget."] }; }
      return null;
    },
  };
  GF.parseStatementCsv = (csvText) => {
    const lines = String(csvText || "").trim().split(/\r?\n/).filter(Boolean); if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase()), idx = (rx) => headers.findIndex((h) => rx.test(h));
    const iDate = idx(/date/), iDesc = idx(/desc|narration|particular|remark|detail/), iDr = idx(/debit|withdrawal|dr/), iCr = idx(/credit|deposit|cr/), iBal = idx(/bal/);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const dr = iDr >= 0 ? GF.toPaise(cols[iDr]) : 0, cr = iCr >= 0 ? GF.toPaise(cols[iCr]) : 0; if (!dr && !cr) continue;
      const desc = iDesc >= 0 ? cols[iDesc] : "", refM = desc.match(/\b([0-9]{12})\b/);
      rows.push({ occurredAt: Date.parse(cols[iDate] || "") || Date.now(), description: desc, counterparty: desc.split(/[\/\-]/)[0]?.trim() || "Bank Entry", amountPaise: dr || cr, direction: dr ? "DEBIT" : "CREDIT", balancePaise: iBal >= 0 && cols[iBal] ? GF.toPaise(cols[iBal]) : null, ref: refM ? refM[1] : null });
    }
    return rows;
  };
  GF.toCsv = (txs, data) => {
    const head = "id,dateTime,type,amountINR,category,account,merchant,paymentMethod,ref,status,source";
    return [head, ...txs.map((t) => [t.id, t.dateTime, t.type, GF.fromPaise(t.amount), data.categories.find((c) => c.id === t.categoryId)?.name || "", data.accounts.find((a) => a.id === t.accountId)?.name || "", t.merchant || "", t.paymentMethod || "", t.ref || "", t.status || "", t.source || ""].map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(","))].join("\n");
  };
  const subtle = () => (typeof crypto !== "undefined" ? crypto.subtle : globalThis.crypto.subtle);
  GF.hashPin = async (pin) => { const buf = await subtle().digest("SHA-256", new TextEncoder().encode("glassfinance.v2:" + pin)); return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join(""); };
  GF.encryptBackup = async (obj, password) => {
    const c = typeof crypto !== "undefined" ? crypto : globalThis.crypto; const salt = c.getRandomValues(new Uint8Array(16)), iv = c.getRandomValues(new Uint8Array(12));
    const baseKey = await subtle().importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
    const key = await subtle().deriveKey({ name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" }, baseKey, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
    const cipher = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(obj))));
    const b64 = (u) => typeof Buffer !== "undefined" ? Buffer.from(u).toString("base64") : btoa(String.fromCharCode(...u));
    return JSON.stringify({ v: 1, alg: "AES-GCM-256", salt: b64(salt), iv: b64(iv), data: b64(cipher) });
  };
  GF.decryptBackup = async (payload, password) => {
    const p = JSON.parse(payload); const unb64 = (s) => typeof Buffer !== "undefined" ? new Uint8Array(Buffer.from(s, "base64")) : Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
    const baseKey = await subtle().importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
    const key = await subtle().deriveKey({ name: "PBKDF2", salt: unb64(p.salt), iterations: 210000, hash: "SHA-256" }, baseKey, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    return JSON.parse(new TextDecoder().decode(await subtle().decrypt({ name: "AES-GCM", iv: unb64(p.iv) }, key, unb64(p.data))));
  };
  GF.createStore = (storage) => ({
    data: null, listeners: [],
    load() { const raw = storage.getItem(GF.KEY); if (raw) { try { this.data = JSON.parse(raw); return this.data; } catch (_) {} } this.data = GF.seedDemo(GF.emptyData()); this.save(); return this.data; },
    save() { this.data.meta.savedAt = new Date().toISOString(); storage.setItem(GF.KEY, JSON.stringify(this.data)); this.listeners.forEach((fn) => fn(this.data)); },
    subscribe(fn) { this.listeners.push(fn); },
    hasDemo() { return ["accounts", "transactions", "budgets", "goals", "bills", "recurring"].some((k) => (this.data[k] || []).some((x) => x.isDemo)); },
    clearDemo() { for (const k of ["accounts", "transactions", "budgets", "goals", "bills", "recurring"]) this.data[k] = (this.data[k] || []).filter((x) => !x.isDemo); if (!this.data.accounts.length) this.data.accounts.push({ id: "acc_cash", name: "Cash", type: "cash", bankName: "", opening: 0, currency: "INR", icon: "💵" }); this.data.meta.demoSeeded = false; this.save(); },
    upsert(col, item) { const arr = this.data[col]; const idx = arr.findIndex((x) => x.id === item.id); if (idx >= 0) arr[idx] = item; else arr.unshift(item); this.save(); },
    remove(col, id) { this.data[col] = this.data[col].filter((x) => x.id !== id); this.save(); },
    mirrorAuto(it) {
      if (!it || !it.countsInLedger) { this.data.transactions = this.data.transactions.filter((t) => t.id !== it?.id); this.save(); return; }
      const type = it.kind === "INCOME" || it.kind === "REFUND" || it.kind === "REVERSAL" ? "income" : it.kind === "EXPENSE" ? "expense" : (it.kind === "TRANSFER" && it.toAccountId && it.fromAccountId && it.toAccountId !== it.fromAccountId) ? "transfer" : null;
      if (!type) return;
      const existing = this.data.transactions.find((t) => t.id === it.id);
      this.upsert("transactions", { id: it.id, type, amount: it.amountPaise, accountId: existing?.accountId || this.data.settings.defaultAccountId || this.data.accounts[0]?.id, toAccountId: it.toAccountId || null, categoryId: existing?.userEdited ? existing.categoryId : (it.categoryId || "cat_other"), merchant: existing?.userEdited ? existing.merchant : (it.counterparty || it.appName), dateTime: GF.D.isoDT(new Date(it.occurredAt || Date.now())), paymentMethod: it.appName || "UPI", ref: it.upiRef || it.txnId || "", status: it.verification || "PROVISIONAL", source: (it.sources || []).join(", "), userEdited: !!existing?.userEdited });
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
