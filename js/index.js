// fix impossible fingering: https://c1.staticflickr.com/9/8095/8485721150_5763b36301_b.jpg
const ABC = "qazwsxedcrfvtgbyhnujmikolp";
const cmp = (a, b) => ABC.indexOf(a) - ABC.indexOf(b);
const intcmp = (a, b) => b - a;
const dist = (dx, dy) => Math.sqrt((dx * dx) + (dy * dy));
const taxicab = (dx, dy) => Math.abs(dx) + Math.abs(dy);

const LEFT = ["a", "j"];
const RIGHT = ["d", "l"];
const UP = ["w", "i"];
const DOWN = ["s", "k"];
const MOVE = [].concat(LEFT, RIGHT, UP, DOWN).join("");
const UNIT = 25/9

const MAX_MANA = 4;

const SPELLS = {
  "sgni": {
    name: "fireball",
    mnemonic: "ignis",
    damage: 1,
    x: undefined,
    y: undefined,
    tx: undefined,
    ty: undefined,
    purge: false,
  },
  "bil": {
    mnemonic: "bibl",
    name: "book",
  },
  "aru": {
    mnemonic: "aura",
    name: "wind",
  },
  "agu": {
    name: "increase",
    mnemonic: "aug",
  },
};

const state = {
  player: {
    el: null,
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    mana: 2,
  },
  forest: {
    dx: 0,
    dy: 0,
    data: [],
  },
  enemies: [],
  movementKeys: new Set(),
  keysPressed: new Set(),
  spell: [],
  displayedSpell: null,
  spells: [],
};

function main() {
  fetch("/data/forest.txt")
    .then((res) => res.text())
    .then((res) => {
      const forest = res.replace(/ /g, "").replace(/\n+/g, "\n").split("\n");
      state.forest.data = forest;
      loadMap([0, 6], [7, 7], forest);
    });
  state.displayedSpell = document.getElementById("spell-slot");
  requestAnimationFrame(loop.bind(null, performance.now()));
  document.body.addEventListener("keydown", onKeyDown);
  document.body.addEventListener("keyup", onKeyUp);
}

function loadMap([x, y], [px, py], forest) {
  const WIDTH = 18;
  const HEIGHT = 9;
  const dx = x * WIDTH;
  const dy = y * HEIGHT;
  state.forest.dx = dx;
  state.forest.dy = dy;
  const zone = document.getElementById("map");
  zone.replaceChildren();

  const player = tileToEl("W", 2 * px, 2 * py);
  zone.appendChild(player);
  state.player.el = player;
  state.player.x = px;
  state.player.y = py;

  for (let w = 0; w < WIDTH; w++) {
    for (let h = 0; h < HEIGHT; h++) {
      const tile = forest[dy + h][dx + w];
      const el = tileToEl(tile, 2 * w, 2 * h);
      if (el != null) {
        prependChild(zone, el);
      }
    }
  }
}

function prependChild(parent, child) {
  if (parent.firstChild) {
    parent.insertBefore(child, parent.firstChild);
  } else {
    parent.appendChild(child);
  }
}

function tileToEl(tile, x, y) {
  const type = ({
    "|": "tree",
    "@": "rock",
    "~": "water",
    "W": "player",
    "B": "bat",
  })[tile];

  if (type == null) return undefined;

  const el = createEl({"class": `absolute ${type}`, href: "#" + type, style: `left: ${x * UNIT}%; top: ${y * UNIT}%`})
  if (type === "bat") {
    state.enemies.push({ name: type, el, x, y, health: 2 });
  }
  return el;
}

function loop(t1, t2) {
  nextState(t2 - t1);
  drawState();
  requestAnimationFrame(loop.bind(null, t2));
}

function isAlphaNum(char) {
  return /^[a-z0-9]$/i.test(char);
}

function onKeyDown(event) {
  const { key, keyCode, repeat } = event;
  if (repeat) return null;

  if (isAlphaNum(key)) {
    handleMovementStart(key);
    state.keysPressed.add(key);
  }

  if (MOVE.includes(key)) {
    state.movementKeys.add(key);
  }
}

function onKeyUp(event) {
  const { key, keyCode } = event;

  if (state.keysPressed.has(key)) {
    onSpell();
  }

  if (MOVE.includes(key)) {
    handleMovementStop(key);
  }
}

function onSpell() {
  const keys = Array.from(state.keysPressed);
  if (!keys.every((key) => MOVE.includes(key))) {
    const spell = keys.sort(cmp).join("");
    state.spell.push(spell);
    cast(spell);
  }

  state.keysPressed.clear();
}

function cast(lastSpell) {
  const data = SPELLS[lastSpell];

  if (data?.name === "fireball") {
    const enemy = nearestEnemy();
    if (enemy) {
      const tx = enemy.x;
      const ty = enemy.y;
      const x = state.player.x;
      const y = state.player.y;
      const zone = document.getElementById("map");

      const el = createEl({"class": data.name, href: "#" + data.name, style: `left: ${x * UNIT}%; top: ${y * UNIT}%` })
      zone.appendChild(el);
      state.spells.push({ ...data, el, x, y, tx, ty });
    }
    state.spell = [];
  } else if (data?.name === "nullify") {
    state.spell = [];
  }
}

function nearestEnemy() {
  const { x, y } = state.player;
  return state.enemies.map((enemy) => ({
    ...enemy,
    distance: dist(enemy.x - x, enemy.y - y),
  })).sort((a, b) => b.distance - a.distance).at(0);
}

function handleMovementStart(key) {
  if (LEFT.includes(key)) {
    state.player.dx = -1;
  } else if (RIGHT.includes(key)) {
    state.player.dx = 1;
  } else if (UP.includes(key)) {
    state.player.dy = -1;
  } else if (DOWN.includes(key)) {
    state.player.dy = 1;
  }
}

function handleMovementStop(key) {
  const hasKey = (key) => state.movementKeys.has(key);
  if (LEFT.includes(key)) {
    state.player.dx = RIGHT.some(hasKey) ? 1 : 0;
  } else if (RIGHT.includes(key)) {
    state.player.dx = LEFT.some(hasKey) ? -1 : 0;
  } else if (UP.includes(key)) {
    state.player.dy = DOWN.some(hasKey) ? 1 : 0;
  } else if (DOWN.includes(key)) {
    state.player.dy = UP.some(hasKey) ? -1 : 0;
  }
  state.movementKeys.delete(key);
}

const PX_PER_SECOND = 3;
const SECONDS_PER_MS = 1 / 1000;
const FACTOR = PX_PER_SECOND * SECONDS_PER_MS;
const BUFFER = 50;
const EPSILON = 1;
const HITBOX = 2;
function nextState(delta) {
  nextPlayer(delta);
  nextSpells(delta);
  nextEnemies(delta);
}

function posToTile(x, y) {
  const fy = state.forest.dy + Math.round(y * 0.5);
  const fx = state.forest.dx + Math.round(x * 0.5);
  return state.forest.data[fy]?.[fx];
}

const EMPTY = "_";
function isWalkable(x, y) {
  const fy = state.forest.dy + Math.round(y * 0.5);
  const row = state.forest.data[fy];

  const fxl = state.forest.dx + Math.round(x * 0.5);
  const fxr = state.forest.dx + Math.round((x - 1) * 0.5);

  return /\w/.test(row?.[fxl] ?? "") && /\w/.test(row?.[fxr] ?? "");
}

function nextPlayer(delta) {
  const t = FACTOR * delta;
  const { dx, dy } = state.player;
  const x = state.player.x + dx * t;
  const y = state.player.y + dy * t;

  if (isWalkable(x, y)) {
    state.player.x = x;
    state.player.y = y;
  }
}

function nextSpells(delta) {
  state.spells.forEach((spell) => {
    const dx = spell.tx - spell.x;
    const dy = spell.ty - spell.y;
    const distance = dist(dx, dy);
    const t = (FACTOR * delta) / distance;
    if (Math.abs(dx) > EPSILON) {
      spell.x += dx * t;
    }
    if (Math.abs(dy) > EPSILON) {
      spell.y += dy * t;
    }
    if (distance < EPSILON + EPSILON) {
      spell.purge = true;
    }
  });
}

function nextEnemies(delta) {
  const t = FACTOR * delta;
  state.enemies.forEach((enemy) => {
    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    const t2 = (0.75 * t) / dist(dx, dy);
    // TODO have the enemies chase oscillating ghost targets so they don't clump
    if (Math.abs(dx) > EPSILON) {
      enemy.x += dx * t2;
    }
    if (Math.abs(dy) > EPSILON) {
      enemy.y += dy * t2;
    }
  });
}

function drawState() {
  if (state.player.el) {
    state.player.el.style.left = (state.player.x * UNIT) + "%"
    state.player.el.style.top = (state.player.y * UNIT) + "%"
  }
  state.enemies.forEach((enemy, ei, enemies) => {
    enemy.el.style.left = (enemy.x * UNIT) + '%'
    enemy.el.style.top = (enemy.y * UNIT) + '%'
    state.spells.forEach((spell, si, spells) => {
      const dist = taxicab(spell.x - enemy.x, spell.y - enemy.y);
      if (dist <= HITBOX) {
        enemy.health -= spell.damage;
        spells.splice(ei, 1);
        spell.el.remove();
      }
    });
    if (enemy.health <= 0) {
      enemies.splice(ei, 1);
      enemy.el.remove();
    }
  });
  state.spells.forEach((spell, index, spells) => {
    if (spell.purge) {
      spells.splice(index, 1);
      spell.el.remove();
    } else {
      spell.el.style.left = (spell.x * UNIT) + 'px'
      spell.el.style.top = (spell.y * UNIT) + 'px'
    }
  });
  if (state.displayedSpell) {
    state.displayedSpell.textContent = state.spell.join("-");
  }
}

function createEl(attrs) {
  const el = document.createElement("div");
  Object.entries(attrs).forEach(([key, val]) => {
    el.setAttribute(key, val);
  })
  return el
}

main();
