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

export const SCENES = { chain };
