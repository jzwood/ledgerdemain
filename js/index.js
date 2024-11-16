// fix impossible fingering: https://c1.staticflickr.com/9/8095/8485721150_5763b36301_b.jpg
const ABC = "qazwsxedcrfvtgbyhnujmikolp";
const cmp = (a, b) => ABC.indexOf(a) - ABC.indexOf(b);

const LEFT = ["a", "j"];
const RIGHT = ["d", "l"];
const UP = ["w", "i"];
const DOWN = ["s", "k"];
const MOVE = [].concat(LEFT, RIGHT, UP, DOWN).join("");

const state = {
  player: {
    el: null,
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
  },
  enemies: [],
  movementKeys: new Set(),
  keysPressed: new Set(),
  spell: [],
  actionQueue: [],
};

function main() {
  fetch("/data/forest.txt")
    .then((res) => res.text())
    .then((res) => {
      const forest = res.replace(/ /g, "").replace(/\n+/g, "\n").split("\n");
      loadMap(0, 6, forest);
    });
  requestAnimationFrame(loop.bind(null, performance.now()));
}

function loadMap(x, y, forest) {
  const zone = document.getElementById("map");
  zone.replaceChildren();
  const WIDTH = 18;
  const HEIGHT = 9;
  for (let w = 0; w < WIDTH; w++) {
    for (let h = 0; h < HEIGHT; h++) {
      const tile = forest[y * HEIGHT + h][x * WIDTH + w];
      const el = tileToEl(tile, 2 * w, 2 * h);
      if (tile === "|") {
        zone.appendChild(el);
      } else {
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
    ",": "",
    "|": "tree",
    "@": "rock",
    "~": "water",
    "W": "player",
  })[tile];

  const ns = "http://www.w3.org/2000/svg";
  const el = document.createElementNS(ns, "use");
  el.setAttribute("x", x);
  el.setAttribute("y", y);
  el.setAttribute("class", type);
  el.setAttribute("href", "#" + type);
  return el;
}

//const playerEl = document.querySelector(".player");
//const enemyEls = Array.from(document.querySelectorAll(".bat"));
//state.player = {
//el: playerEl,
//x: 5,
//y: 5,
//dx: 0,
//dy: 0,
//ghosts: [0, 0, 0, 0],
//};
//state.enemies = enemyEls.map((enemy) => ({
//el: enemy,
//x: Math.random() * 7,
//y: Math.random() * 5,
//}));

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
    endSpellSegment();
    state.keysPressed.clear();
  }

  if (MOVE.includes(key)) {
    handleMovementStop(key);
    state.movementKeys.delete(key);
  }
}

function endSpellSegment() {
  const keys = Array.from(state.keysPressed).sort(cmp).join("");
  state.spell.push(keys);
  console.log(keys);
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

function nextPlayer(delta) {
  const t = FACTOR * delta;
  const { dx, dy } = state.player;
  state.player.x += dx * t;
  state.player.y += dy * t;
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

function drawState() {
  state.player.el?.setAttribute("x", state.player.x);
  state.player.el?.setAttribute("y", state.player.y);
  state.enemies.forEach((enemy) => {
    enemy.el.setAttribute("x", enemy.x);
    enemy.el.setAttribute("y", enemy.y);
  });
}

main();
document.body.addEventListener("keydown", onKeyDown);
document.body.addEventListener("keyup", onKeyUp);
