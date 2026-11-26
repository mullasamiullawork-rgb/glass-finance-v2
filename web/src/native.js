(function () {
  const GF = window.GF;
  const Cap = window.Capacitor;
  const isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  const plugin = (name) => {
    if (!isNative) return null;
    try { return (Cap.registerPlugin ? Cap.registerPlugin(name) : null) || (Cap.Plugins && Cap.Plugins[name]) || null; } catch (_) { return null; }
  };
  const N = (GF.native = {
    isNative, App: plugin("App"), Haptics: plugin("Haptics"), StatusBar: plugin("StatusBar"),
    SplashScreen: plugin("SplashScreen"), Filesystem: plugin("Filesystem"), Share: plugin("Share"),
    LocalNotifications: plugin("LocalNotifications"), AutoTrack: plugin("AutoTrack"),
  });
  GF.haptic = (ms = 8) => { try { if (isNative && N.Haptics) N.Haptics.impact({ style: ms >= 15 ? "MEDIUM" : "LIGHT" }); } catch (_) {} };
  GF.downloadFile = async (name, content) => {
    if (isNative && N.Filesystem && N.Share) {
      try {
        const r = await N.Filesystem.writeFile({ path: name, data: content, directory: "CACHE", encoding: "utf8" });
        await N.Share.share({ title: name, url: r.uri, dialogTitle: "Save or share " + name });
        return;
      } catch (e) { if (e && /cancel/i.test(String(e.message || e))) return; }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    a.download = name; a.click();
  };
  GF.syncAutoTrack = async (full = false) => {
    if (!N.AutoTrack) return;
    try {
      const since = full ? 0 : Number(localStorage.getItem("gf.lastSync") || 0);
      const res = await N.AutoTrack.list({ since });
      (res?.items || []).forEach((it) => GF.store.mirrorAuto(it));
      if (res?.now) localStorage.setItem("gf.lastSync", String(res.now));
    } catch (_) {}
  };
  GF.bootNative = async () => {
    if (!isNative) return;
    document.documentElement.classList.add("native");
    if (N.AutoTrack) {
      try {
        const local = localStorage.getItem(GF.KEY);
        const r = await N.AutoTrack.loadState();
        if (r?.json) {
          const nativeState = JSON.parse(r.json);
          const localAt = local ? JSON.parse(local).meta?.savedAt || "" : "";
          if (!local || (nativeState.meta?.savedAt || "") > localAt) { localStorage.setItem(GF.KEY, r.json); GF.store.load(); }
        }
      } catch (_) {}
      GF.store.subscribe((data) => N.AutoTrack.saveState({ json: JSON.stringify(data) }).catch(() => {}));
      N.AutoTrack.addListener?.("detected", (tx) => { GF.store.mirrorAuto(tx); GF.toast(`Detected ${tx.appName || "UPI"}: ${GF.fmtINR(tx.amountPaise)}`); GF.render?.(); });
      await GF.syncAutoTrack(true);
    }
    if (N.App) {
      N.App.addListener("backButton", () => { if (GF.closeSheet?.()) return; const h = location.hash || "#/home"; if (h === "#/home") N.App.minimizeApp(); else location.hash = "#/home"; });
      N.App.addListener("resume", () => GF.syncAutoTrack(false));
    }
    setTimeout(() => N.SplashScreen?.hide({ fadeOutDuration: 200 }).catch(() => {}), 120);
  };
})();
