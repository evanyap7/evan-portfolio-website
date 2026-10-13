// The project diagrams, as timelines. Times are milliseconds into the loop;
// reel.js supplies the helpers and runs the result. Names refer to the
// data-a attributes on each diagram's SVG in index.html.

const OK = '#b9f2df';
const BAD = '#ff8fb1';
const LINE = 'rgba(255, 255, 255, 0.28)';

// Personal Assistant Bot: three messages try the cheapest model first. The
// third fails there and is passed on, then the cost meter settles.
function chain({ track, pop, fade, draw, travel, jolt, count, ease }) {
  const badge = (at) => [
    [at, { opacity: 0, scale: 0.5 }],
    [at + 350, { opacity: 1, scale: 1 }, ease.spring],
    [at + 500, { opacity: 1, scale: 1 }],
    [at + 650, { opacity: 0, scale: 1 }],
  ];
  const glow = (at, colour, ms) => [
    [at, { stroke: LINE }],
    [at + 100, { stroke: colour }],
    [at + ms, { stroke: colour }],
    [at + ms + 200, { stroke: LINE }],
  ];

  pop('in1', 250);
  pop('in2', 370);
  pop('in3', 490);
  pop('m1', 300);
  pop('m2', 420, { pulse: [5300] });
  pop('m3', 540);
  fade('wires', 600);
  fade('hops', 700);
  fade('notes', 800);
  fade('meter', 700);

  travel('dot1', [[1000, 92, 68], [1500, 92, 128]]);
  travel('dot2', [[2100, 240, 68], [2300, 240, 98], [2700, 92, 98], [2950, 92, 128]]);
  travel('dot3', [[3500, 388, 68], [3700, 388, 98], [4250, 92, 98], [4500, 92, 128]]);
  travel('dot4', [[5000, 152, 158], [5300, 180, 158]]);

  track('ok1', [...badge(1500), ...badge(2950)]);
  track('no1', badge(4500));
  track('m1box', [...glow(1500, OK, 500), ...glow(2950, OK, 500), ...glow(4500, BAD, 600)]);
  track('m1', jolt(4500));

  track('m2box', [[5300, { stroke: LINE }], [5450, { stroke: OK }]]);
  pop('ok2', 5300);

  fade('saving', 5800);
  draw('cost', 5900, 1200, { from: 0, to: 0.65 });
  count('saving', 5900, 1200, 65, (value) => `~${value}% lower`);
}

// Trading agent: the LLM step is struck out and dropped for a plain rule,
// then each stage stamps a block into the ledger as the idea passes it.
function ledger({ track, pop, fade, draw, travel, ease }) {
  pop('llm', 250, { exit: [2300, 2700] });
  track('llm', [
    [2000, { translate: '0px 0px', rotate: '0deg' }],
    [2700, { translate: '0px 220px', rotate: '16deg' }, ease.fall],
  ]);
  draw('strike', 1300, 350);
  track('noedge', [[1500, { opacity: 0 }], [1750, { opacity: 1 }], [2600, { opacity: 1 }], [2900, { opacity: 0 }]]);
  pop('rule', 2750);
  fade('drops', 900);

  ['verify', 'size', 'risk'].forEach((name, i) => {
    const on = 3700 + i * 650;
    pop(name, 370 + i * 120, { pulse: [on] });
    pop(`${name}ok`, on);
    track(`${name}box`, [[on, { stroke: LINE }], [on + 150, { stroke: OK }]]);
    track(`arrow${i + 1}`, [
      [800, { opacity: 0, stroke: LINE }],
      [1100, { opacity: 1, stroke: LINE }],
      [on - 150, { opacity: 1, stroke: LINE }],
      [on, { opacity: 1, stroke: OK }],
    ]);
  });

  [0, 1, 2, 3].forEach((i) => {
    const x = 72 + i * 108;
    const start = 3150 + i * 650;
    travel(`stamp${i + 1}`, [[start, x, 98], [start + 350, x, 172]]);
    pop(`block${i + 1}`, start + 350, { pulse: [6200 + i * 90] });
    if (i) draw(`link${i}`, start + 350, 200);
  });

  fade('ledgernote', 5800);
}

// Research agent: a claim is typed, sources arrive, the one that was never
// retrieved is dropped, and the truth rating sweeps to its score.
function rating({ track, pop, fade, draw, jolt, count, ease }) {
  // The claim is 16 characters, revealed one per step.
  track('cover', [
    [500, { opacity: 1, scale: '1 1' }],
    [1700, { opacity: 1, scale: '0 1' }, 'steps(16)'],
  ]);
  track('caret', [
    [400, { opacity: 0, translate: '0px 0px' }],
    [500, { opacity: 1, translate: '0px 0px' }],
    [1700, { opacity: 1, translate: '160px 0px' }, 'steps(16)'],
    [1900, { opacity: 1, translate: '160px 0px' }],
    [2100, { opacity: 0, translate: '160px 0px' }],
  ]);

  pop('doc1', 2000);
  pop('doc2', 2150);
  pop('doc3', 2300);
  pop('ghost', 2450, { exit: [3700, 4000] });
  track('ghost', [
    ...jolt(3000),
    [4000, { translate: '0px 200px', rotate: '-14deg' }, ease.fall],
  ]);
  fade('grounded', 4100);

  // Overshoots a little before it settles on the score.
  track('gauge', [
    [4400, { strokeDashoffset: 1 }],
    [5450, { strokeDashoffset: 0.24 }, ease.inOut],
    [5800, { strokeDashoffset: 0.28 }],
  ]);
  count('score', 4400, 1200, 72, String);
  draw('for', 5000, 700);
  draw('against', 5300, 600);
}

// Project V-Bẫy: the addressable market narrows to the obtainable one, drawn
// to scale, then the cash line climbs back through break-even.
function market({ track, pop, fade, draw, count, ease }) {
  pop('tam', 300);
  count('tamvalue', 450, 950, 350, (value) => `$${value}M`);

  // A ring the size of the whole market shrinks onto the obtainable share.
  const wide = { translate: '0px -38px', scale: 6.86 };
  const tight = { translate: '0px 0px', scale: 1 };
  track('ring', [
    [1800, { opacity: 0, ...wide }],
    [1950, { opacity: 1, ...wide }],
    [2900, { opacity: 1, ...tight }, ease.inOut],
    [3050, { opacity: 0, ...tight }],
  ]);
  pop('som', 2850);
  fade('somvalue', 3050);
  fade('toscale', 3300);

  fade('axes', 3500);
  fade('title', 3700);
  fade('ticks', 3800);
  fade('band', 4100);
  fade('window', 4200);
  draw('curve', 4500, 1600, { easing: 'linear' });
  // The line crosses zero about three quarters of the way along.
  pop('even', 5730);
}

export const SCENES = { chain, ledger, rating, market };
