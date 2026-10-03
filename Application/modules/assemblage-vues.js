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
        : app.renderRecipesView();
    root.innerHTML = `${app.viewUtils.navigation()}${content}`;
    requestAnimationFrame(() => window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" }));
  }

  app.render = render;
  app.root = root;
})(window.AtTable = window.AtTable || {});
