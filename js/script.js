const playerEl = document.getElementById("player");
const enemies = Array.from(document.querySelectorAll(".enemy"));

const stubEntity = (x, y) => ({x, y, dx: 0, dy: 0})
const state = {
  player: stubEntity(500, 50),
  enemies: [],
  keysPressed: new Set(),
  spell: [],
  actionQueue: [],
}

requestAnimationFrame(loop.bind(null, performance.now()));

function loop(t1, t2) {
  drawState()
  requestAnimationFrame(loop.bind(null, t2));
}

function isAlpha(keyCode) {
  return keyCode >= 97 && keyCode <= 122
}

function isNum(keyCode) {
  return keyCode >= 48 && keyCode <= 57
}

function isSpacebar(keyCode) {
  return keyCode === 32
}

function onKeyDown(event) {
  const { key, keyCode, repeat } = event
  if (repeat) return null
  state.keysPressed.add(keyCode)

  if (isAlpha(keyCode)) {
    state.player.keysPressed.add(keyCode)
  }
}

function onKeyDown(event) {
  const { key, keyCode, repeat } = event
  if (repeat) return null

  if (isNum(keyCode) || isAlpha(keyCode)) {
    state.player.keysPressed.add(keyCode)
  } else if (isSpacebar(keyCode)) {
    // spacebar
  }
}

//setInterval(() => {
  //enemies.forEach((enemy) => {
    //const cx = +enemy.getAttribute("cx");
    //const cy = +enemy.getAttribute("cy");
    //const dx = player.x - cx;
    //const dy = player.y - cy;
    //const factor = 5;
    //if (dx !== 0) {
      //enemy.setAttribute("cx", cx + factor * dx / Math.abs(dx));
    //}
    //if (dy !== 0) {
      //enemy.setAttribute("cy", cy + factor * dy / Math.abs(dy));
    //}
  //});
//}, 1000);


document.body.addEventListener("keydown", onKeyDown);
document.body.addEventListener("keyup", onKeyUp);
