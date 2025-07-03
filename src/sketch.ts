import * as P5 from "p5";

const TEST_CASE_1 = `4 6 7
1 1 2
2 3 4
4 3 4
5 1 2
6 3 4
3 2 3
6 3 4
`;

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;

function intToPastelRGB(n: number): [number, number, number] {
  const goldenRatioConjugate = 0.61803398875;
  const h = (n * goldenRatioConjugate) % 1;

  // Low saturation and high value → pastel
  const s = 0.4 + (0.1 * ((n * 13) % 5)) / 4; // s ∈ [0.4, 0.5]
  const v = 0.9;

  return hsvToRgb(h, s, v);
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r: number = 0,
    g: number = 0,
    b: number = 0;

  // prettier-ignore
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

type Bar = {
  id: number;
  height: number;
  left: number;
  right: number;
};

class AmidaKuji {
  laneCount: number;
  height: number;
  bars: Array<Bar>;
  queryIndex: number;
  currentBars: Array<Bar>;
  isBarActive: Map<number, boolean>;
  paths: Array<Array<{ r: number; c: number }>>;

  constructor(laneCount: number, height: number, bars: Array<Bar> = []) {
    this.laneCount = laneCount;
    this.height = height;
    this.bars = bars;
    this.currentBars = [];
    this.queryIndex = 0;
    this.isBarActive = new Map();
    this.bars.forEach((b) => this.isBarActive.set(b.id, true));
    this.paths = [];
    this.updateSolution();
  }

  init(laneCount: number, height: number, bars: Array<Bar>) {
    this.laneCount = laneCount;
    this.height = height;
    this.bars = bars;
    this.currentBars = [];
    this.queryIndex = 0;
    this.isBarActive = new Map();
    this.bars.forEach((b) => this.isBarActive.set(b.id, true));
    this.paths = [];
    this.updateSolution();
  }

  updateBars() {
    this.currentBars = [];
    for (let i = 0; i < this.queryIndex; ++i) {
      const bar = this.bars[i];

      const idx = this.currentBars.findIndex(
        (b) =>
          b.height === bar.height &&
          b.left === bar.left &&
          b.right === bar.right
      );

      if (idx !== -1) {
        this.currentBars.splice(idx, 1);
      } else {
        this.currentBars.push(bar);
      }
    }

    this.updateSolution();
  }

  incQueryIndex() {
    if (this.queryIndex + 1 <= this.bars.length) {
      this.queryIndex++;
      this.updateBars();
    }
  }

  decQueryIndex() {
    if (this.queryIndex - 1 >= 0) {
      this.queryIndex--;
      this.updateBars();
    }
  }

  updateSolution() {
    for (let lane = 0; lane < this.laneCount; ++lane) {
      this.paths[lane] = this.solve(lane);
    }
  }

  solve(lane: number): Array<{ r: number; c: number }> {
    this.currentBars.sort((a, b) => {
      if (a.height === b.height) {
        return a.left - b.left;
      }
      return b.height - a.height;
    });

    let c = lane + 1;
    let r = this.height;
    const points = [{ r, c }];

    for (let i = 0; i < this.currentBars.length; ++i) {
      const cb = this.currentBars[i];
      if (!this.isBarActive.get(cb.id)) continue;

      if (r >= cb.height) {
        if (c === cb.left) {
          points.push({ r: cb.height, c: cb.left });
          points.push({ r: cb.height, c: cb.right });
          c = this.currentBars[i].right;
        } else if (c === this.currentBars[i].right) {
          points.push({ r: cb.height, c: cb.right });
          points.push({ r: cb.height, c: cb.left });
          c = this.currentBars[i].left;
        }
      }
    }

    points.push({ r: 0, c });

    return points;
  }

  draw(
    p5: P5,
    tlx: number,
    tly: number,
    w: number,
    h: number,
    justClicked: boolean
  ) {
    const divisor = Math.max(20, this.laneCount);
    const labelRadius = Math.min(w / divisor, h / divisor);
    const textSize = Math.min(15, labelRadius);
    const laneW = w / (this.laneCount - 1);
    const laneH = h - 4 * labelRadius;
    const laneY = tly + 2 * labelRadius;
    const barPadAmt = h / 25;
    const barAreaY = laneY + barPadAmt;
    const barAreaH = laneH - 2 * barPadAmt;
    const barUnitH = barAreaH / this.height;
    const topLabelY = tly + labelRadius;
    const botLabelY = tly + laneH + 3 * labelRadius;
    const endLanes = [];

    {
      for (let lane = 0; lane < this.laneCount; ++lane) {
        const points = this.paths[lane];
        const laneX = tlx + lane * laneW;
        const color = intToPastelRGB(lane);
        const weight = 9 + 6 * (this.laneCount - lane - 1);
        for (let i = 0; i < points.length - 1; ++i) {
          const isStart = i === 0;
          const isEnd = i === points.length - 2;

          const p = points[i];
          const q = points[i + 1];
          const pOffset = isStart ? topLabelY : barAreaY;
          const py = pOffset + (this.height - p.r) * barUnitH;
          const px = tlx + (p.c - 1) * laneW;
          const qy = isEnd
            ? botLabelY
            : barAreaY + (this.height - q.r) * barUnitH;

          const qx = tlx + (q.c - 1) * laneW;
          {
            p5.push();
            p5.strokeWeight(weight);
            p5.stroke(color);
            p5.fill(color);
            p5.line(px, py, qx, qy);
            if (isEnd) {
              p5.ellipseMode("radius");
              p5.circle(qx, botLabelY, labelRadius);
            }
            p5.pop();
          }
          if (isEnd) {
            endLanes[points[i + 1].c - 1] = lane;
          }
        }
        {
          p5.push();
          p5.strokeWeight(weight);
          p5.stroke(color);
          p5.fill(color);
          p5.ellipseMode("radius");
          p5.circle(laneX, topLabelY, labelRadius);
          p5.pop();
        }
      }
    }

    // draw lanes
    for (let i = 0; i < this.laneCount; ++i) {
      const laneX = tlx + i * laneW;
      const laneLabel = `${i + 1}`;
      const laneEndLabel = `${endLanes[i] + 1}`;
      const labelFill = endLanes[i] === i ? [220, 255, 220] : [255, 220, 220];
      {
        p5.push();
        p5.strokeWeight(3);
        p5.ellipseMode("radius");
        p5.textAlign("center", "center");
        p5.textSize(textSize);

        {
          p5.push();
          p5.fill(labelFill);
          p5.circle(laneX, topLabelY, labelRadius);
          p5.circle(laneX, botLabelY, labelRadius);
          p5.pop();
        }

        p5.text(laneLabel, laneX, topLabelY);
        p5.text(laneEndLabel, laneX, botLabelY);

        // lane
        p5.line(laneX, laneY, laneX, laneY + laneH);

        p5.pop();
      }
    }

    // p5.line(tlx, tly, tlx + w, tly + h);
    let anyHover = false;

    // draw bars
    for (const bar of this.currentBars) {
      const barY = barAreaY + (this.height - bar.height) * barUnitH;
      const barLeftX = tlx + (bar.left - 1) * laneW;
      const barRightX = tlx + (bar.right - 1) * laneW;
      const barColor = this.isBarActive.get(bar.id) ? 0 : 180;

      const heightLabel = `y=${bar.height}`;

      {
        p5.push();
        {
          p5.push();
          p5.stroke(0);
          p5.fill(255);
          const width = p5.textWidth(heightLabel);
          p5.rect(barLeftX + 4, barY + 4, width + 2, 14);
          p5.pop();
        }

        p5.textAlign("left", "top");
        p5.text(heightLabel, barLeftX + 5, barY + 5);
        p5.strokeWeight(3);
        p5.stroke(barColor);
        p5.line(barLeftX, barY, barRightX, barY);
        p5.pop();
      }

      // check if we're hovering the bar
      {
        const cy = 5;
        const mx = p5.mouseX;
        const my = p5.mouseY;
        if (
          barLeftX < mx &&
          mx < barRightX &&
          barY - cy < my &&
          my < barY + cy
        ) {
          anyHover = true;
          if (justClicked) {
            this.isBarActive.set(bar.id, !this.isBarActive.get(bar.id));
            this.updateSolution();
          }

          p5.push();
          p5.strokeWeight(5);
          p5.stroke(barColor);
          p5.line(barLeftX, barY, barRightX, barY);
          p5.pop();
        } else {
        }
      }
    }
    if (anyHover) {
      p5.cursor("pointer");
    } else {
      p5.cursor("default");
    }
  }
}

type Control = {
  container: P5.Element;
  input: P5.Element;
  button: P5.Element;
};

function createControl(
  p5: P5,
  labelText: string,
  value: string,
  ta: boolean = false
): Control {
  const ctr = p5.createDiv();
  {
    const elt = ctr.elt as HTMLDivElement;
    elt.style.display = "flex";
    elt.style.flexDirection = "column";
    elt.style.gap = "0.25rem";
  }

  const button = p5.createButton(`set ${labelText}`);
  const input = ta
    ? p5.createElement("textarea", value)
    : p5.createInput(value);

  if (ta) {
    input.elt.style.resize = "none";
    const resize = () => {
      input.elt.style.height = `auto`;
      input.elt.style.height = `${input.elt.scrollHeight}px`;
    };
    input.elt.addEventListener("input", resize);
    resize();
  }

  ctr.child(button);
  ctr.child(input);

  return {
    container: ctr,
    input,
    button,
  };
}

function tryParseNumber(s: string): number {
  const i = parseInt(s);
  if (Number.isNaN(i)) throw new Error("Could not parse string as int");

  return i;
}

function parseJapaneseLotteryInput(s: string): {
  laneCount: number;
  height: number;
  queries: Array<Bar>;
} {
  if (s === "") throw new Error("expected a non-empty string");

  const lines = s.split("\n");
  const firstLine = lines[0].split(" ");
  if (firstLine.length !== 3)
    throw new Error("expected three values on the first line");
  const laneCount: number = tryParseNumber(firstLine[0]);
  const height: number = tryParseNumber(firstLine[1]);
  const bars: Array<Bar> = [];

  for (let i = 1; i < lines.length; ++i) {
    const line = lines[i];
    // accept a newline terminated input
    if (i === lines.length - 1 && line.length === 0) break;

    const strings = line.split(" ");

    if (strings.length !== 3)
      throw new Error("expected three numbers per line");
    const height = tryParseNumber(strings[0]);
    const x0 = tryParseNumber(strings[1]);
    const x1 = tryParseNumber(strings[2]);
    const left = Math.min(x0, x1);
    const right = Math.max(x0, x1);
    bars.push({ id: i, height, left, right });
  }

  return { laneCount, height, queries: bars };
}

let amidaKuji: AmidaKuji;
let inputCtrl: Control;
let decQueryIndexButton: P5.Element;
let incQueryIndexButton: P5.Element;

let mouseWasPressed: boolean;

let rightArrowCallback = () => {};
let leftArrowCallback = () => {};

function setup(p5: P5) {
  mouseWasPressed = p5.mouseIsPressed;

  p5.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const tc1 = parseJapaneseLotteryInput(TEST_CASE_1);
  amidaKuji = new AmidaKuji(tc1.laneCount, tc1.height, tc1.queries);

  const inputCtr = p5.createDiv();
  {
    const inputCtrElt = inputCtr.elt as HTMLDivElement;
    inputCtrElt.style.display = "flex";
    inputCtrElt.style.flexDirection = "row";
    inputCtrElt.style.gap = "1rem";
  }

  inputCtrl = createControl(p5, "puzzle input", TEST_CASE_1, true);

  decQueryIndexButton = p5.createButton("<");
  decQueryIndexButton.elt.style.height = "20px";

  const barIndexSpan = p5.createSpan(`query index: ${amidaKuji.queryIndex}`);

  incQueryIndexButton = p5.createButton(">");
  incQueryIndexButton.elt.style.height = "20px";

  rightArrowCallback = () => {
    amidaKuji.incQueryIndex();
    barIndexSpan.html(`query index: ${amidaKuji.queryIndex}`);
  };
  leftArrowCallback = () => {
    amidaKuji.decQueryIndex();
    barIndexSpan.html(`query index: ${amidaKuji.queryIndex}`);
  };
  decQueryIndexButton.mouseClicked(leftArrowCallback);
  incQueryIndexButton.mouseClicked(rightArrowCallback);

  inputCtrl.button.mouseClicked(() => {
    try {
      const { laneCount, height, queries } = parseJapaneseLotteryInput(
        inputCtrl.input.value() as string
      );
      amidaKuji.init(laneCount, height, queries);
      barIndexSpan.html(`query index: ${amidaKuji.queryIndex}`);
    } catch (e) {
      console.error(e);
    }
  });

  const instructions = p5.createDiv();

  instructions.html(`
    <details>
      <summary>instructions</summary>
      <ul>
        <li>paste a test case from <a href="https://open.kattis.com/problems/japaneselottery">the problem</a> in the input box</li>
        <li>use buttons [<] [>] (or arrow keys) to step through test case</li>
        <li>click a bar to toggle it on and off</li>
      </ul>
    </details>
    `);

  inputCtr.child(inputCtrl.container);
  inputCtr.child(decQueryIndexButton);
  inputCtr.child(barIndexSpan);
  inputCtr.child(incQueryIndexButton);
  inputCtr.child(instructions);
}

function keyPressed(p5: P5) {
  console.log(p5.key);
  if (p5.key === "ArrowRight") {
    rightArrowCallback();
  } else if (p5.key === "ArrowLeft") {
    leftArrowCallback();
  }
}

function draw(p5: P5) {
  p5.background(255);

  const padX = 40;
  const padY = 20;

  const justClicked = !p5.mouseIsPressed && mouseWasPressed;

  amidaKuji.draw(
    p5,
    padX,
    padY,
    CANVAS_WIDTH - padX * 2,
    CANVAS_HEIGHT - padY * 2,
    justClicked
  );

  mouseWasPressed = p5.mouseIsPressed;
}

export const sketch = (p5: P5) => {
  p5.setup = () => setup(p5);
  p5.draw = () => draw(p5);
  p5.keyPressed = () => keyPressed(p5);
};
