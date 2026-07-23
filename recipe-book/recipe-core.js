(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.RecipeCore = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  function cleanCount(value) {
    const count = Number(value);
    return Number.isFinite(count) && count > 0 ? count : 0;
  }

  function scaleIngredients(recipe, servings) {
    return (recipe.ingredients || []).map((ingredient) => ({
      name: ingredient.name,
      amount: cleanCount(ingredient.amount) * cleanCount(servings),
      unit: ingredient.unit || "份",
    }));
  }

  function buildShoppingList(recipes, cart) {
    const merged = new Map();
    recipes.forEach((recipe) => {
      const servings = cleanCount(cart[recipe.id]);
      if (!servings) return;
      scaleIngredients(recipe, servings).forEach((ingredient) => {
        const key = `${ingredient.name}__${ingredient.unit}`;
        const existing = merged.get(key) || { ...ingredient, amount: 0 };
        existing.amount += ingredient.amount;
        merged.set(key, existing);
      });
    });
    return [...merged.values()].sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
  }

  function mergeTags(existing, additions) {
    return [...new Set([...(existing || []), ...(additions || [])].map((item) => String(item).trim()).filter(Boolean))];
  }

  function shuffleItems(items, random = Math.random) {
    const shuffled = [...(items || [])];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }

  function clearCart() {
    return {};
  }

  return { buildShoppingList, clearCart, mergeTags, scaleIngredients, shuffleItems };
});
