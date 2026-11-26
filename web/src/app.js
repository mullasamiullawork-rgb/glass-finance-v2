document.addEventListener("DOMContentLoaded", async () => {
  const GF = window.GF;
  GF.store = GF.createStore(localStorage);
  GF.store.load();
  GF.store.subscribe(() => GF.render());
  await GF.bootNative();
  await GF.lock();
  document.getElementById("fab").onclick = () => GF.openAdd();
  window.addEventListener("hashchange", () => GF.render());
  if (!location.hash) location.hash = "#/home";
  GF.render();
});
