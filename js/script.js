const playerEl = document.getElementById("player");
const enemies = Array.from(document.querySelectorAll(".enemy"));

// fix impossible fingering: https://c1.staticflickr.com/9/8095/8485721150_5763b36301_b.jpg
const abc = "qazwsxedcrfvtgbyhnujmikolp"
const cmp = (a, b) => abc.indexOf(a) - abc.indexOf(b)

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

function onKeyDown(event) {
  const { key, keyCode, repeat } = event
  if (repeat) return null

  if (/^\w$/.test(key)) {
    state.keysPressed.add(key)
  }
}

function onKeyUp(event) {
  const { key, keyCode } = event

  if (state.keysPressed.has(key)) {
    endSpellSegment()
  }

  state.keysPressed.delete(key)
}

function endSpellSegment() {
  const keys = Array.from(state.keysPressed).sort(cmp).join('')
  state.spell.push(keys)
  state.keysPressed.clear()
  console.log(keys, state.spell)
}

function drawState() {

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
