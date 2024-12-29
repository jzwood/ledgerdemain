const fs = require("fs");

const forest = fs.readFileSync("./data/forest.txt", "utf8");
const chars = Array.from(new Set(forest));
console.log(chars);
