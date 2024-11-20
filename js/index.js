// fix impossible fingering: https://c1.staticflickr.com/9/8095/8485721150_5763b36301_b.jpg
const ABC = "qazwsxedcrfvtgbyhnujmikolp";
const NS = "http://www.w3.org/2000/svg";
const cmp = (a, b) => ABC.indexOf(a) - ABC.indexOf(b);
const intcmp = (a, b) => b - a;

const LEFT = ["a", "j"];
const RIGHT = ["d", "l"];
const UP = ["w", "i"];
const DOWN = ["s", "k"];
const MOVE = [].concat(LEFT, RIGHT, UP, DOWN).join("");

const SPELLS = {
  "sgni": {
    name: "fireball",
    damage: 1,
    x0: undefined,
    y0: undefined,
    x1: undefined,
    y2: undefined,
  },
};

const state = {
  player: {
    el: null,
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
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

  const el = document.createElementNS(NS, "use");
  el.setAttribute("x", x);
  el.setAttribute("y", y);
  el.setAttribute("class", type);
  el.setAttribute("href", "#" + type);
  if (type === "bat") {
    state.enemies.push({ name: type, x, y, el });
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
    cast();
  }

  state.keysPressed.clear();
}

function cast() {
  const spell = state.spell.join("-");
  const data = SPELLS[spell];
  const enemy = nearestEnemy();
  console.log(enemy, data, spell);
  if (data && enemy) {
    const x2 = enemy.x;
    const y2 = enemy.y;
    const x1 = state.player.x;
    const y1 = state.player.y;
    const el = document.createElementNS(NS, "use");
    const zone = document.getElementById("map");
    el.setAttribute("x", x1);
    el.setAttribute("y", y1);
    el.setAttribute("class", data.name);
    el.setAttribute("href", "#" + data.name);
    zone.appendChild(el);
    state.spells.push({ ...data, x1, y1, x2, y2, el });
    state.spell = [];
  }
}

function nearestEnemy() {
  const { x, y } = state.player;
  return state.enemies.map((enemy) => ({
    ...enemy,
    distance: dist(x, enemy.x, y, enemy.y),
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
function nextState(delta) {
  nextPlayer(delta);
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

function nextEnemies(delta) {
  const t = FACTOR * delta;
  state.enemies.forEach((enemy) => {
    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    const t2 = (0.75 * t) / Math.sqrt(dx * dx + dy * dy);
    // TODO have the enemies chase oscillating ghost targets so they don't clump
    if (Math.abs(dx) > EPSILON) {
      enemy.x += dx * t2;
    }
    if (Math.abs(dy) > EPSILON) {
      enemy.y += dy * t2;
    }
  });
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function drawState() {
  state.player.el?.setAttribute("x", state.player.x);
  state.player.el?.setAttribute("y", state.player.y);
  state.enemies.forEach((enemy) => {
    enemy.el.setAttribute("x", enemy.x);
    enemy.el.setAttribute("y", enemy.y);
  });
}

main();
