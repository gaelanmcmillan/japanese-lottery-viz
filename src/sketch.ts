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

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;

type Bridge = {
  id: number;
  height: number;
  left: number;
  right: number;
};

class AmidaKuji {
  laneCount: number;
  height: number;
  bridges: Array<Bridge>;
  bridgeIndex: number;
  currentBridges: Array<Bridge>;
  isBridgeActive: Map<number, boolean>;
  solvingFor: number | undefined;

  constructor(laneCount: number, height: number, bridges: Array<Bridge> = []) {
    this.laneCount = laneCount;
    this.height = height;
    this.bridges = bridges;
    this.currentBridges = [];
    this.bridgeIndex = 0;
    this.isBridgeActive = new Map();
    this.bridges.forEach((b) => this.isBridgeActive.set(b.id, true));
  }

  init(laneCount: number, height: number, bridges: Array<Bridge>) {
    this.laneCount = laneCount;
    this.height = height;
    this.bridges = bridges;
    this.currentBridges = [];
    this.bridgeIndex = 0;
    this.isBridgeActive = new Map();
    this.bridges.forEach((b) => this.isBridgeActive.set(b.id, true));
  }

  updateBridges() {
    this.currentBridges = [];
    for (let i = 0; i < this.bridgeIndex; ++i) {
      const bridge = this.bridges[i];

      const idx = this.currentBridges.findIndex(
        (b) =>
          b.height === bridge.height &&
          b.left === bridge.left &&
          b.right === bridge.right
      );

      if (idx !== -1) {
        this.currentBridges.splice(idx, 1);
      } else {
        this.currentBridges.push(bridge);
      }
    }
  }

  incBridgeIndex() {
    if (this.bridgeIndex + 1 <= this.bridges.length) {
      this.bridgeIndex++;
      this.updateBridges();
    }
  }

  decBridgeIndex() {
    if (this.bridgeIndex - 1 >= 0) {
      this.bridgeIndex--;
      this.updateBridges();
    }
  }

  solve(lane: number): Array<{ r: number; c: number }> {
    this.currentBridges.sort((a, b) => {
      if (a.height === b.height) {
        return a.left - b.left;
      }
      return b.height - a.height;
    });

    let c = lane + 1;
    let r = this.height;
    const points = [{ r, c }];

    for (let i = 0; i < this.currentBridges.length; ++i) {
      const cb = this.currentBridges[i];
      if (!this.isBridgeActive.get(cb.id)) continue;

      if (r >= cb.height) {
        if (c === cb.left) {
          points.push({ r: cb.height, c: cb.left });
          points.push({ r: cb.height, c: cb.right });
          c = this.currentBridges[i].right;
        } else if (c === this.currentBridges[i].right) {
          points.push({ r: cb.height, c: cb.right });
          points.push({ r: cb.height, c: cb.left });
          c = this.currentBridges[i].left;
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
    const bridgePadAmt = h / 25;
    const bridgeAreaY = laneY + bridgePadAmt;
    const bridgeAreaH = laneH - 2 * bridgePadAmt;
    const bridgeUnitH = bridgeAreaH / this.height;
    const topLabelY = tly + labelRadius;
    const botLabelY = tly + laneH + 3 * labelRadius;

    for (let i = 0; i < this.laneCount; ++i) {
      const laneX = tlx + i * laneW;
      // check to see if we're hovering a handle
      {
        const dx = p5.mouseX - laneX;
        const dy = p5.mouseY - topLabelY;
        if (dx * dx + dy * dy <= labelRadius * labelRadius) {
          this.solvingFor = i;
        }
      }

      // check to see if we're hovering a handle
      {
        const dx = p5.mouseX - laneX;
        const dy = p5.mouseY - botLabelY;
        if (dx * dx + dy * dy <= labelRadius * labelRadius) {
          this.solvingFor = i;
        }
      }
    }

    if (this.solvingFor !== undefined) {
      const points = this.solve(this.solvingFor);
      const laneX = tlx + this.solvingFor * laneW;
      for (let i = 0; i < points.length - 1; ++i) {
        const isStart = i === 0;
        const isEnd = i === points.length - 2;

        const p = points[i];
        const q = points[i + 1];
        const pOffset = isStart ? topLabelY : bridgeAreaY;
        const py = pOffset + (this.height - p.r) * bridgeUnitH;
        const px = tlx + (p.c - 1) * laneW;
        const qy = isEnd
          ? botLabelY
          : bridgeAreaY + (this.height - q.r) * bridgeUnitH;
        const qx = tlx + (q.c - 1) * laneW;
        {
          p5.push();
          p5.strokeWeight(9);
          p5.stroke(200, 100, 100);
          p5.fill(200, 100, 100);
          p5.line(px, py, qx, qy);
          if (isEnd) {
            p5.ellipseMode("radius");
            p5.circle(qx, botLabelY, labelRadius);
          }
          p5.pop();
        }
      }
      {
        p5.push();
        p5.strokeWeight(9);
        p5.stroke(200, 100, 100);
        p5.fill(200, 100, 100);
        p5.ellipseMode("radius");
        p5.circle(laneX, topLabelY, labelRadius);
        p5.pop();
      }
    }

    // draw lanes
    for (let i = 0; i < this.laneCount; ++i) {
      const laneX = tlx + i * laneW;
      const laneLabel = `${i + 1}`;
      {
        p5.push();
        p5.strokeWeight(3);
        p5.ellipseMode("radius");
        p5.textAlign("center", "center");
        p5.textSize(textSize);

        // top label
        p5.circle(laneX, topLabelY, labelRadius);
        p5.text(laneLabel, laneX, topLabelY);

        // bot label
        p5.circle(laneX, botLabelY, labelRadius);
        p5.text(laneLabel, laneX, botLabelY);

        // lane
        p5.line(laneX, laneY, laneX, laneY + laneH);

        p5.pop();
      }
    }

    // p5.line(tlx, tly, tlx + w, tly + h);
    let anyHover = false;

    // draw bridges
    for (const bridge of this.currentBridges) {
      const bridgeY = bridgeAreaY + (this.height - bridge.height) * bridgeUnitH;
      const bridgeLeftX = tlx + (bridge.left - 1) * laneW;
      const heightLabel = `${bridge.height}`;
      const bridgeRightX = tlx + (bridge.right - 1) * laneW;
      const bridgeColor = this.isBridgeActive.get(bridge.id) ? 0 : 180;

      {
        p5.push();
        p5.textAlign("left", "top");
        p5.text(heightLabel, bridgeLeftX + 5, bridgeY + 5);
        p5.strokeWeight(3);
        p5.stroke(bridgeColor);
        p5.line(bridgeLeftX, bridgeY, bridgeRightX, bridgeY);
        p5.pop();
      }

      // check if we're hovering the bridge
      {
        const cy = 5;
        const mx = p5.mouseX;
        const my = p5.mouseY;
        if (
          bridgeLeftX < mx &&
          mx < bridgeRightX &&
          bridgeY - cy < my &&
          my < bridgeY + cy
        ) {
          anyHover = true;
          if (justClicked) {
            this.isBridgeActive.set(
              bridge.id,
              !this.isBridgeActive.get(bridge.id)
            );
          }

          p5.push();
          p5.strokeWeight(5);
          p5.stroke(bridgeColor);
          p5.line(bridgeLeftX, bridgeY, bridgeRightX, bridgeY);
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
  bridges: Array<Bridge>;
} {
  if (s === "") throw new Error("expected a non-empty string");

  const lines = s.split("\n");
  const firstLine = lines[0].split(" ");
  if (firstLine.length !== 3)
    throw new Error("expected three values on the first line");
  const laneCount: number = tryParseNumber(firstLine[0]);
  const height: number = tryParseNumber(firstLine[1]);
  const bridges: Array<Bridge> = [];

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
    bridges.push({ id: i, height, left, right });
  }

  return { laneCount, height, bridges };
}

let amidaKuji: AmidaKuji;
let inputCtrl: Control;
let decBridgeIndexButton: P5.Element;
let incBridgeIndexButton: P5.Element;

let mouseWasPressed: boolean;

function setup(p5: P5) {
  mouseWasPressed = p5.mouseIsPressed;

  p5.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const tc1 = parseJapaneseLotteryInput(TEST_CASE_1);
  amidaKuji = new AmidaKuji(tc1.laneCount, tc1.height, tc1.bridges);

  const inputCtr = p5.createDiv();
  {
    const inputCtrElt = inputCtr.elt as HTMLDivElement;
    inputCtrElt.style.display = "flex";
    inputCtrElt.style.flexDirection = "row";
    inputCtrElt.style.gap = "1rem";
  }

  inputCtrl = createControl(p5, "puzzle input", TEST_CASE_1, true);

  decBridgeIndexButton = p5.createButton("<");
  decBridgeIndexButton.elt.style.height = "20px";

  const bridgeIndexSpan = p5.createSpan(
    `bridge index: ${amidaKuji.bridgeIndex}`
  );

  incBridgeIndexButton = p5.createButton(">");
  incBridgeIndexButton.elt.style.height = "20px";

  decBridgeIndexButton.mouseClicked(() => {
    amidaKuji.decBridgeIndex();
    bridgeIndexSpan.html(`bridge index: ${amidaKuji.bridgeIndex}`);
  });

  incBridgeIndexButton.mouseClicked(() => {
    amidaKuji.incBridgeIndex();
    bridgeIndexSpan.html(`bridge index: ${amidaKuji.bridgeIndex}`);
  });

  inputCtrl.button.mouseClicked(() => {
    try {
      const { laneCount, height, bridges } = parseJapaneseLotteryInput(
        inputCtrl.input.value() as string
      );
      amidaKuji.init(laneCount, height, bridges);
      bridgeIndexSpan.html(`bridge index: ${amidaKuji.bridgeIndex}`);
    } catch (e) {
      console.error(e);
    }
  });

  const instructions = p5.createDiv();

  instructions.html(`
    <details>
      <summary>instructions</summary>
      <ul>
        <li>paste a test case in the input box</li>
        <li>use arrow buttons [<] [>] to step through test case</li>
        <li>hover a label to show its path</li>
        <li>click a bridge to toggle it</li>
      </ul>
    </details>
    `);

  inputCtr.child(inputCtrl.container);
  inputCtr.child(decBridgeIndexButton);
  inputCtr.child(bridgeIndexSpan);
  inputCtr.child(incBridgeIndexButton);
  inputCtr.child(instructions);
}

function keyPressed(p5: P5) {
  if (p5.key === " ") {
  }
}

function draw(p5: P5) {
  p5.background(220);

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
