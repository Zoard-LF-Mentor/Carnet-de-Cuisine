(function (app) {
  const root = document.querySelector("#contenu-principal");

  function render() {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const view = app.state.view;
    const content = view === "epicerie"
      ? app.renderGroceryView()
      : view === "preparation"
        ? app.renderPreparationView()
      : view === "guide"
        ? app.renderGuideView()
      : view === "nathalie"
        ? app.renderNathalieView()
        : app.renderRecipesView();
    const failures = app.recipeLoadFailures || [];
    const warning = failures.length
      ? `<p class="alerte-catalogue" role="alert">Le catalogue est incomplet : ${failures.length} fichier${failures.length === 1 ? "" : "s"} de recette n’a${failures.length === 1 ? "" : "ont"} pas pu être chargé${failures.length === 1 ? "" : "s"}. ${app.escape(failures.slice(0, 3).join(", "))}${failures.length > 3 ? "…" : ""}</p>`
      : "";
    root.innerHTML = `${warning}${app.viewUtils.navigation()}${content}`;
    requestAnimationFrame(() => window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" }));
  }

  app.render = render;
  app.root = root;
})(window.AtTable = window.AtTable || {});
