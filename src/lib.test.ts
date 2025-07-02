import { add } from "./lib";

describe("testing the lib", () => {
  test("add should add", () => {
    expect(add(1, 2)).toBe(3);
  });
});
