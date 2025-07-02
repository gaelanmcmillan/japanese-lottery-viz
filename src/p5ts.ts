import * as P5 from "p5";

/**
 * A subinterface of P5.Element with the correct types for `value`.
 *
 * ### Example usage:
 * ```js
var slider: p5ts.Slider;

const setup = (p5: P5) => {
    p5.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    slider = p5ts.createSlider(p5,0,1,0,0.001);
}

const draw = (p5: P5) => {
    p5.background(220);
    // Note: the type of `slider.value()` is known to be `number`, so no type assertions are required.
    p5.fill(0,255 * slider.value(), 0);
    p5.circle(200, 200, 200);
}
 * ```
 */
export interface Slider extends P5.Element {
    /**
     * Return the value of the slider
     */
    value(): number;

    /**
     * Set the value of the slider and return itself.
     * @param num
     */
    value(num: number): this;
}

export function createSlider(p5: P5, min: number, max: number, value: number, step: number): Slider {
    return p5.createSlider(min, max, value, step) as Slider;
}
