const abcs = "qazwsxedcrfvtgbyhnujmikolp"

const RANK = 4

const rand = () => abcs[Math.floor(Math.random() * 26)]

const nth = n => Array(n).fill(0)

const letters = nth(RANK).map(rand).sort((a, b) => abcs.indexOf(a) - abcs.indexOf(b)).join(' ')
// fix impossible fingering: https://c1.staticflickr.com/9/8095/8485721150_5763b36301_b.jpg

console.log(letters)
