const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const recipes = JSON.parse(fs.readFileSync(path.join(root, "data", "recipes.json"), "utf8"));

assert.equal(recipes.length, 11);
recipes.forEach((recipe) => {
  assert.match(recipe.image || "", /^images\/[a-z0-9-]+\.jpg$/);
  assert.ok(fs.existsSync(path.join(root, recipe.image)), `missing image for ${recipe.id}`);
});

console.log("ok - recipe assets");
