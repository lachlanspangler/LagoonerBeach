#!/bin/sh
# Celebration review (ADR 0012): filmstrips of every moment + contact sheets in docs/media/celebrate.
#   LB_URL=http://localhost:5717 sh scripts/celebrate-review.sh
set -e
F="npx tsx scripts/filmstrip.ts"
O=artifacts/film
M=docs/media/celebrate
mkdir -p $M
$F --stage pinch --out $O/a-pinch --at 0,120,200,280,400,600,900
$F --stage lagoon --out $O/b-lagoon --at 0,120,200,300,450,700,1000
$F --stage cascade --out $O/c-cascade --at 0,150,250,350,500,700,1000
$F --stage spotless --out $O/d-spotless --at 0,200,350,500,700,1000,1250
$F --stage lagoon --best 500 --score 430 --out $O/e-best --at 200,500,900,1200,1600,2200
$F --results 5230,4100 --out $O/f-results --at 0,300,600,900,1300
$F --reveal boxcrab --out $O/g1-uncommon --at 0,150,300,450,700,1300
$F --reveal kraken --out $O/g2-legendary --at 0,300,700,1000,1300,1700,2100
$F --stage biggest --out $O/h-biggest --at 0,220,450,600,800,1100,1500
$F --stage biggest --theme night --out $O/h-biggest-night --at 0,450,800,1100
$F --chapter --out $O/i-chapter --at 0,700,900,1200,1600,2100
C="python3 -I scripts/contact.py"
$C $O/a-pinch $M/a-pinch.jpg "(a) calm 1-cell pinch: no word, no shake, a small scatter"
$C $O/b-lagoon $M/b-combo6-lagoon.jpg "(b) COMBO x6 + Nice Lagoon! (6 cells)"
$C $O/c-cascade $M/c-cascade.jpg "(c) cascade through a thick wall: Ripple x2"
$C $O/d-spotless $M/d-spotless.jpg "(d) Spotless!: tide wash, word in the middle once the ring has left"
$C $O/e-best $M/e-new-best.jpg "(e) mid-game NEW BEST! banner (once per game, after the word)"
$C $O/f-results $M/f-new-high-score.jpg "(f) results: count-up, gold, ribbon, confetti" 0.42 5
$C $O/g1-uncommon $M/g1-reveal-uncommon.jpg "(g) uncommon discovery: pearl -> pop -> card" 0.36 6
$C $O/g2-legendary $M/g2-reveal-legendary.jpg "(g) legendary discovery: tide, rays, fanfare (<= 2 s)" 0.36 7
$C $O/h-biggest $M/h-biggest.jpg "biggest: 3 waves + board clear = Unbelievable!, COMBO x20"
$C $O/h-biggest-night $M/h-biggest-night.jpg "biggest, Night" 0.42 4
$C $O/i-chapter $M/i-chapter.jpg "chapter complete (endless reefs)" 0.42 6
