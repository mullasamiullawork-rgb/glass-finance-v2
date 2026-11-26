(function () {
  const GF = window.GF;
  const $ = (s, p = document) => p.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  GF.toast = (msg) => { const el = $("#toast"); if (!el) return; el.textContent = msg; el.classList.add("show"); clearTimeout(GF._toastT); GF._toastT = setTimeout(() => el.classList.remove("show"), 2600); };
  GF.applyTheme = () => { document.documentElement.dataset.theme = GF.store?.data?.settings?.theme || "system"; };
  GF.closeSheet = () => { const root = $("#sheet-root"); if (!root || !root.innerHTML) return false; root.innerHTML = ""; return true; };
  GF.openSheet = ({ title, body, mount }) => {
    const root = $("#sheet-root");
    root.innerHTML = `<div class="sheet-backdrop" id="sh-bg"><div class="sheet" role="dialog" aria-label="${esc(title)}"><div class="row" style="margin-bottom:12px"><b>${esc(title)}</b><button class="btn sm" id="sh-x">✕</button></div>${body}</div></div>`;
    $("#sh-bg").onclick = (e) => { if (e.target.id === "sh-bg") GF.closeSheet(); };
    $("#sh-x").onclick = () => GF.closeSheet();
    mount?.(root);
  };
  GF.openAdd = (existing = null) => {
    const d = GF.store.data; let type = existing?.type || "expense";
    const catsFor = (t) => d.categories.filter((c) => c.type === (t === "income" ? "income" : "expense"));
    const draw = (sh) => {
      const cats = catsFor(type);
      sh.querySelector(".sheet").innerHTML = `
        <div class="row" style="margin-bottom:12px"><b>${existing ? "Edit" : "Quick Add"} Transaction</b><button class="btn sm" id="sh-x">✕</button></div>
        <div class="seg" style="margin-bottom:12px">${["expense", "income", "transfer"].map((t) => `<button data-t="${t}" class="${type === t ? "active" : ""}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}</div>
        <label class="field"><span>Amount (₹)</span><input id="qa-amt" type="number" step="0.01" placeholder="0.00" value="${existing ? GF.fromPaise(existing.amount) : ""}" style="font-size:24px;font-weight:800"></label>
        <div class="row-wrap" style="margin-bottom:10px">${[50, 100, 200, 500, 1000].map((v) => `<button class="btn sm" data-q="${v}">₹${v}</button>`).join("")}</div>
        ${type !== "transfer" ? `<label class="field"><span>Category</span><select id="qa-cat">${cats.map((c) => `<option value="${c.id}" ${existing?.categoryId === c.id ? "selected" : ""}>${c.icon} ${esc(c.name)}</option>`).join("")}</select></label>` : ""}
        <label class="field"><span>${type === "transfer" ? "From Account" : "Account"}</span><select id="qa-acc">${d.accounts.map((a) => `<option value="${a.id}" ${existing?.accountId === a.id ? "selected" : ""}>${a.icon} ${esc(a.name)}</option>`).join("")}</select></label>
        ${type === "transfer" ? `<label class="field"><span>To Account</span><select id="qa-to">${d.accounts.map((a) => `<option value="${a.id}" ${existing?.toAccountId === a.id ? "selected" : ""}>${a.icon} ${esc(a.name)}</option>`).join("")}</select></label>` : ""}
        <label class="field"><span>Merchant / Title</span><input id="qa-merch" value="${esc(existing?.merchant || "")}" placeholder="e.g. Tea Stall, Salary"></label>
        <label class="field"><span>Date &amp; Time</span><input id="qa-dt" type="datetime-local" value="${esc(existing?.dateTime || GF.D.isoDT())}"></label>
        <label class="field"><span>Note</span><input id="qa-note" value="${esc(existing?.note || "")}" placeholder="Optional note"></label>
        <div class="row" style="margin-top:12px">${existing ? `<button class="btn danger" id="qa-del">Delete</button>` : ""}<button class="btn primary" style="flex:1" id="qa-save">Save Transaction</button></div>`;
      $("#sh-x", sh).onclick = () => GF.closeSheet();
      sh.querySelectorAll("[data-t]").forEach((b) => (b.onclick = () => { type = b.dataset.t; draw(sh); }));
      sh.querySelectorAll("[data-q]").forEach((b) => (b.onclick = () => { $("#qa-amt", sh).value = b.dataset.q; }));
      if (existing) $("#qa-del", sh).onclick = () => { GF.store.remove("transactions", existing.id); GF.closeSheet(); GF.toast("Deleted"); };
      $("#qa-save", sh).onclick = () => {
        const amt = GF.toPaise($("#qa-amt", sh).value); if (amt <= 0) return GF.toast("Enter a valid amount");
        const acc = $("#qa-acc", sh).value, toAcc = type === "transfer" ? $("#qa-to", sh).value : null;
        if (type === "transfer" && acc === toAcc) return GF.toast("Pick a different destination account");
        GF.store.upsert("transactions", { id: existing?.id || GF.uid("tx"), type, amount: amt, accountId: acc, toAccountId: toAcc, categoryId: type === "transfer" ? null : $("#qa-cat", sh).value, merchant: $("#qa-merch", sh).value.trim() || (type === "transfer" ? "Account Transfer" : "Manual Entry"), dateTime: $("#qa-dt", sh).value || GF.D.isoDT(), note: $("#qa-note", sh).value.trim(), paymentMethod: existing?.paymentMethod || "Manual", status: existing?.status || "CONFIRMED", source: existing?.source || "MANUAL", userEdited: true });
        GF.closeSheet(); GF.toast("Saved");
      };
    };
    GF.openSheet({ title: "Quick Add", body: "", mount: draw });
  };
  GF.lock = () => new Promise((resolve) => {
    const s = GF.store.data.settings; if (!s.pinHash) return resolve();
    let entry = ""; const el = document.createElement("div");
    el.style.cssText = "position:fixed;inset:0;z-index:999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;backdrop-filter:blur(28px);background:rgba(8,12,24,0.86);color:#fff";
    const draw = (msg = "Enter 4-digit PIN") => {
      el.innerHTML = `<div style="font-size:36px">🔒</div><b>${msg}</b><div>${[0,1,2,3].map((i) => i < entry.length ? "●" : "○").join(" ")}</div><div class="grid-3" style="width:240px">${["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k) => k ? `<button class="btn" data-k="${k}">${k}</button>` : "<span></span>").join("")}</div>`;
      el.querySelectorAll("[data-k]").forEach((b) => (b.onclick = async () => {
        const k = b.dataset.k; if (k === "⌫") entry = entry.slice(0, -1); else if (entry.length < 4) entry += k; draw();
        if (entry.length === 4) { if ((await GF.hashPin(entry)) === s.pinHash) { el.remove(); resolve(); } else { entry = ""; draw("Wrong PIN"); } }
      }));
    };
    draw(); document.body.append(el);
    if (s.biometricEnabled && GF.native?.AutoTrack?.checkBiometric) {
      GF.native.AutoTrack.checkBiometric().then((r) => {
        if (!r?.available) return;
        GF.native.AutoTrack.authenticateBiometric({ title: "Unlock Glass Finance", subtitle: "Verify your identity" })
          .then((res) => { if (res?.authenticated) { el.remove(); resolve(); } });
      }).catch(() => {});
    }
  });
  function txRow(t, d, F) {
    const cat = d.categories.find((c) => c.id === t.categoryId) || { icon: "↕️", name: "Transfer" };
    const cls = t.type === "income" ? "good" : t.type === "expense" ? "bad" : "", sign = t.type === "income" ? "+" : t.type === "expense" ? "-" : "";
    return `<button class="item" data-tx="${t.id}"><div class="col"><span class="item-title">${cat.icon} ${esc(t.merchant || cat.name)} ${t.isDemo ? '<span class="pill demo">DEMO</span>' : ""}</span><span class="item-sub">${GF.D.short(t.dateTime)} · ${esc(t.paymentMethod || t.source || "")}</span></div><b class="${cls}">${sign}${F(t.amount)}</b></button>`;
  }
  function renderHome(d) {
    const mk = GF.D.monthKey(GF.D.today()), hide = d.settings.hideBalances, F = (p, opt) => GF.fmtINR(p, { hide, ...opt });
    const tot = GF.calc.totalBalance(d), mt = GF.calc.totals(d.transactions, GF.D.monthStart(mk), GF.D.monthEnd(mk)), insights = GF.calc.insights(d);
    return `
      ${GF.store.hasDemo() ? `<div class="glass card row"><span class="pill demo">DEMO DATA</span><span class="tiny muted">Sample records active</span><button class="btn sm" id="clr-demo">Clear Demo</button></div>` : ""}
      <div class="glass hero"><div class="row"><span class="label">Total Balance</span><button class="btn sm" id="toggle-hide">${hide ? "👁️ Show" : "🙈 Hide"}</button></div><div class="amount">${F(tot)}</div>
        <div class="grid-3"><div class="col"><span class="tiny muted">Month Income</span><b class="good">${F(mt.income)}</b></div><div class="col"><span class="tiny muted">Month Expense</span><b class="bad">${F(mt.expense)}</b></div><div class="col"><span class="tiny muted">Savings (${mt.rate}%)</span><b>${F(mt.savings)}</b></div></div>
      </div>
      <div class="glass card row"><div class="col"><b>⚡ Automatic UPI Tracking</b><span class="tiny muted">${GF.native.isNative ? (d.settings.autoTrack ? "Active · On-device" : "Paused") : "Android APK feature"}</span></div><a href="#/auto" class="btn sm">Dashboard</a></div>
      <div class="glass card"><div class="row" style="margin-bottom:8px"><b>Accounts</b><a href="#/accounts" class="tiny">Manage</a></div><div class="list">${d.accounts.map((a) => `<div class="item"><div class="col"><span class="item-title">${a.icon} ${esc(a.name)}</span><span class="item-sub">${esc(a.bankName || a.type)}</span></div><b>${F(GF.calc.accountBalance(a, d.transactions))}</b></div>`).join("")}</div></div>
      ${insights.length ? `<div class="glass card"><b>💡 Insights</b><ul style="margin:8px 0 0;padding-left:18px">${insights.map((i) => `<li class="tiny" style="margin:4px 0">${esc(i)}</li>`).join("")}</ul></div>` : ""}
      <div class="glass card"><div class="row" style="margin-bottom:8px"><b>Recent Transactions</b><a href="#/tx" class="tiny">See all</a></div><div class="list">${d.transactions.slice(0, 5).map((t) => txRow(t, d, F)).join("") || `<p class="tiny muted">No transactions yet.</p>`}</div></div>`;
  }
  GF.render = () => {
    GF.applyTheme(); const d = GF.store.data, hide = d.settings.hideBalances, F = (p) => GF.fmtINR(p, { hide });
    const route = (location.hash || "#/home").replace("#/", "").split("?")[0], mk = GF.D.monthKey(GF.D.today());
    $("#topbar").innerHTML = `<h1>Glass Finance</h1><div class="row-wrap"><a href="#/search" class="btn sm">🔍</a><a href="#/assistant" class="btn sm">✨ AI</a></div>`;
    document.querySelectorAll(".tab").forEach((a) => a.classList.toggle("active", a.dataset.tab === route));
    let html = "";
    if (route === "home") html = renderHome(d);
    else if (route === "tx" || route === "search") {
      const q = GF._q || "", list = GF.searchTx(d, q);
      html = `<div class="glass card"><input id="tx-q" placeholder="Search merchant, amount, category, ref..." value="${esc(q)}"></div><div class="list">${list.map((t) => txRow(t, d, F)).join("") || `<div class="glass card tiny muted">No matching transactions.</div>`}</div>`;
    } else if (route === "budget") {
      const rows = d.budgets.filter((b) => b.month === mk);
      html = `<div class="glass card row"><b>Monthly Budgets</b><span class="tiny muted">${mk}</span></div><div class="list">${rows.map((b) => { const st = GF.calc.budgetState(b, d.transactions), cat = d.categories.find((c) => c.id === b.categoryId); return `<div class="glass card"><div class="row"><b>${cat?.icon || ""} ${esc(cat?.name || "Budget")}</b><span class="pill ${st.state}">${st.pct}%</span></div><div class="tiny muted">${F(st.spent)} of ${F(st.limit)} · ${st.remaining >= 0 ? F(st.remaining) + " left" : F(-st.remaining) + " over"}</div><div class="progress ${st.state}"><span style="width:${Math.min(100, st.pct)}%"></span></div></div>`; }).join("")}</div>`;
    } else if (route === "analytics") {
      const mt = GF.calc.totals(d.transactions, GF.D.monthStart(mk), GF.D.monthEnd(mk)), cats = GF.calc.byCategory(d.transactions, GF.D.monthStart(mk), GF.D.monthEnd(mk));
      html = `<div class="glass card"><div class="grid-3"><div class="col"><span class="tiny muted">Income</span><b class="good">${F(mt.income)}</b></div><div class="col"><span class="tiny muted">Expenses</span><b class="bad">${F(mt.expense)}</b></div><div class="col"><span class="tiny muted">Savings Rate</span><b>${mt.rate}%</b></div></div></div><div class="glass card"><b>Category Breakdown</b><div class="list" style="margin-top:10px">${cats.map((c) => { const cat = d.categories.find((x) => x.id === c.categoryId), pct = mt.expense > 0 ? Math.round((c.amount / mt.expense) * 100) : 0; return `<div><div class="row tiny"><span>${cat?.icon || ""} ${esc(cat?.name || "Other")}</span><b>${F(c.amount)} (${pct}%)</b></div><div class="progress"><span style="width:${pct}%"></span></div></div>`; }).join("") || `<p class="tiny muted">No expense data this month.</p>`}</div></div>`;
    } else if (route === "goals") {
      html = `<div class="list">${d.goals.map((g) => { const p = GF.calc.goalProgress(g); return `<div class="glass card"><div class="row"><b>🎯 ${esc(g.name)}</b><span>${p.pct}%</span></div><div class="tiny muted">${F(p.saved)} saved of ${F(p.target)} · ${F(p.remaining)} left</div><div class="progress"><span style="width:${p.pct}%"></span></div></div>`; }).join("") || `<div class="glass card tiny muted">No financial goals yet.</div>`}</div>`;
    } else if (route === "bills") {
      html = `<div class="list">${d.bills.map((b) => `<div class="glass card row"><div class="col"><b>${esc(b.name)}</b><span class="tiny muted">Due ${GF.D.short(b.dueDate)} · ${GF.calc.billStatus(b).toUpperCase()}</span></div><b>${F(b.amount)}</b></div>`).join("")}</div>`;
    } else if (route === "assistant") {
      const ans = GF._ans ? GF.assistant.answer(d, GF._ans) : null;
      html = `<div class="glass card"><input id="ai-q" placeholder="Ask: How much did I spend this month?" value="${esc(GF._ans || "")}"><button class="btn primary" id="ai-go" style="margin-top:8px;width:100%">Ask Offline Assistant</button></div>${ans ? `<div class="glass card"><b>From Your Data</b>${ans.data.map((x) => `<p class="tiny">${esc(x)}</p>`).join("")}${ans.guidance ? `<b>General Guidance</b>${ans.guidance.map((x) => `<p class="tiny muted">${esc(x)}</p>`).join("")}` : ""}</div>` : ""}`;
    } else if (route === "auto" || route === "autotx") {
      const autoList = d.transactions.filter((t) => t.source && t.source !== "MANUAL");
      html = `<div class="glass card"><b>⚡ Automatic Tracking</b><p class="tiny muted">Detects Paytm, Google Pay, PhonePe, BHIM, Amazon Pay, and Bank SMS notifications on-device.</p>${GF.native.isNative ? `<div class="row-wrap"><button class="btn primary sm" id="auto-perm">Notification Access</button><button class="btn sm" id="auto-rebind">Reconnect Listener</button></div>` : `<span class="pill warn">Install Android APK for live detection</span>`}</div><div class="list">${autoList.map((t) => txRow(t, d, F)).join("") || `<div class="glass card tiny muted">No auto-detected transactions yet.</div>`}</div>`;
    } else if (route === "accounts") {
      html = `<div class="list">${d.accounts.map((a) => `<div class="glass card row"><div class="col"><b>${a.icon} ${esc(a.name)}</b><span class="tiny muted">${esc(a.bankName || a.type)}</span></div><b>${F(GF.calc.accountBalance(a, d.transactions))}</b></div>`).join("")}</div>`;
    } else if (route === "settings") {
      html = `<div class="glass card"><b>Theme</b><div class="seg" style="margin-top:8px">${["system", "light", "dark"].map((t) => `<button data-theme-set="${t}" class="${d.settings.theme === t ? "active" : ""}">${t}</button>`).join("")}</div></div><div class="glass card list"><button class="item" id="exp-csv">📄 Export CSV</button><button class="item" id="exp-pdf">📑 Export PDF Summary</button><button class="item" id="exp-json">💾 Export JSON Backup</button></div>`;
    } else {
      html = `<div class="list"><a href="#/auto" class="item"><b>⚡ Automatic Tracking &amp; UPI</b><span>→</span></a><a href="#/accounts" class="item"><b>🏦 Accounts &amp; Wallets</b><span>→</span></a><a href="#/goals" class="item"><b>🎯 Financial Goals &amp; Savings</b><span>→</span></a><a href="#/bills" class="item"><b>🧾 Bills &amp; Recurring</b><span>→</span></a><a href="#/assistant" class="item"><b>✨ Offline Financial Assistant</b><span>→</span></a><a href="#/settings" class="item"><b>⚙️ Settings, Backups &amp; Exports</b><span>→</span></a></div>`;
    }
    $("#view").innerHTML = html;
    $("#clr-demo")?.addEventListener("click", () => { GF.store.clearDemo(); GF.toast("Demo data removed"); });
    $("#toggle-hide")?.addEventListener("click", () => { d.settings.hideBalances = !d.settings.hideBalances; GF.store.save(); });
    $("#tx-q")?.addEventListener("input", (e) => { GF._q = e.target.value; GF.render(); });
    $("#ai-go")?.addEventListener("click", () => { GF._ans = $("#ai-q").value; GF.render(); });
    $("#auto-perm")?.addEventListener("click", () => GF.native.AutoTrack?.openNotificationAccess());
    $("#auto-rebind")?.addEventListener("click", () => GF.native.AutoTrack?.requestRebind().then(() => GF.toast("Listener rebind requested")));
    $("#exp-csv")?.addEventListener("click", () => GF.downloadFile("GlassFinance.csv", GF.toCsv(d.transactions, d)));
    $("#exp-json")?.addEventListener("click", () => GF.downloadFile("GlassFinance-Backup.json", JSON.stringify(d, null, 2)));
    $("#exp-pdf")?.addEventListener("click", () => {
      if (GF.native.AutoTrack?.exportPdfSummary) {
        const mt = GF.calc.totals(d.transactions, GF.D.monthStart(mk), GF.D.monthEnd(mk));
        GF.native.AutoTrack.exportPdfSummary({ title: "Glass Finance Summary", subtitle: mk, fileName: "GlassFinance-Summary.pdf", lines: ["## Overview", `Income: ${GF.fmtINR(mt.income)} | Expense: ${GF.fmtINR(mt.expense)} | Savings: ${GF.fmtINR(mt.savings)}`] }).then(() => GF.toast("PDF ready to share"));
      } else window.print();
    });
    document.querySelectorAll("[data-theme-set]").forEach((b) => (b.onclick = () => { d.settings.theme = b.dataset.themeSet; GF.store.save(); }));
    document.querySelectorAll("[data-tx]").forEach((b) => (b.onclick = () => GF.openAdd(d.transactions.find((x) => x.id === b.dataset.tx))));
  };
})();
