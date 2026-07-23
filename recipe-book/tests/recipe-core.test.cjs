const assert = require("node:assert/strict");
const { buildShoppingList, scaleIngredients, mergeTags, shuffleItems, clearCart } = require("../recipe-core.js");

const recipes = [
  { id: "a", ingredients: [{ name: "牛肉", amount: 300, unit: "g" }], seasonings: ["生抽"] },
  { id: "b", ingredients: [{ name: "牛肉", amount: 200, unit: "g" }, { name: "小葱", amount: 1, unit: "把" }], seasonings: ["盐"] },
];

assert.deepEqual(scaleIngredients(recipes[0], 2), [{ name: "牛肉", amount: 600, unit: "g" }]);
assert.deepEqual(buildShoppingList(recipes, { a: 2, b: 1 }), [
  { name: "牛肉", amount: 800, unit: "g" },
  { name: "小葱", amount: 1, unit: "把" },
]);
assert.deepEqual(mergeTags(["家常菜", "牛肉"], ["牛肉", "快手菜"]), ["家常菜", "牛肉", "快手菜"]);
assert.deepEqual(shuffleItems(["a", "b", "c"], () => 0), ["b", "c", "a"]);
assert.deepEqual(clearCart({ fish: 1, beef: 2 }), {});
console.log("ok - recipe core");
