(function (app) {
  function pageHeader(kicker, title, subtitle) {
    const escape = app.escape;
    return `<header class="entete-page"><div><p class="surtitre">${escape(kicker)}</p><h1>${escape(title)}<span>.</span></h1><p class="sous-titre-page">${escape(subtitle)}</p></div></header>`;
  }

  function navigation() {
    const tabs = [["recettes", "01", "Recettes"], ["preparation", "02", "Préparer"], ["epicerie", "03", "Épicerie"], ["nathalie", "04", "Nathalie"], ["guide", "05", "Guide"]];
    return `<nav class="navigation-principale" aria-label="Navigation principale">${tabs.map(([view, number, name]) => `<button type="button" class="onglet-navigation ${app.state.view === view ? "actif" : ""}" data-view="${view}" aria-current="${app.state.view === view ? "page" : "false"}"><span>${number}</span>${name}${view === "preparation" && app.state.recipesToPrepare.length ? `<b>${app.state.recipesToPrepare.length}</b>` : ""}</button>`).join("")}</nav>`;
  }

  app.viewUtils = { pageHeader, navigation };
})(window.AtTable = window.AtTable || {});
