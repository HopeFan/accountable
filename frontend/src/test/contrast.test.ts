import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  resolve(process.cwd(), "src/theme/tokens.css"),
  "utf8",
);
const lightBlock = css.match(/:root\s*{([^}]*)}/)![1];
const darkBlock = css.match(/:root\[data-theme="dark"\]\s*{([^}]*)}/)![1];
type Mode = "light" | "dark";

/** A hex token for the mode; dark falls back to the light value when it doesn't change. */
const tokenIn = (mode: Mode, name: string): string => {
  const find = (block: string) =>
    block.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
  const hex = (mode === "dark" && find(darkBlock)) || find(lightBlock);
  if (!hex) throw new Error(`token --${name} not found`);
  return hex;
};

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
/** The lane is Sea Mist over the page colour: 40% in light mode, 8% in dark mode. */
function lane(mode: Mode): string {
  const share = mode === "light" ? 0.4 : 0.08;
  const f = tokenIn(mode, "mist");
  const p = tokenIn(mode, "page");
  const mix = [1, 3, 5].map((i) =>
    Math.round(
      parseInt(f.slice(i, i + 2), 16) * share +
        parseInt(p.slice(i, i + 2), 16) * (1 - share),
    ),
  );
  return "#" + mix.map((v) => v.toString(16).padStart(2, "0")).join("");
}

// Every text and background pairing the app uses for small text. Each must pass 4.5:1.
const PAIRS: [string, string, string][] = [
  ["muted", "panel", "secondary text on panels"],
  ["muted", "page", "secondary text on the page"],
  ["muted", "soft", "secondary text on pills and stat boxes"],
  ["ink", "panel", "text on panels"],
  ["ink", "page", "text on the page"],
  ["ink", "soft", "text on pills and stat boxes"],
  ["on-accent", "primary", "primary buttons and the Negotiation block"],
  ["on-accent", "secondary", "the Qualified block"],
  ["on-accent", "tertiary", "the Proposal block"],
  ["on-lost", "lost", "the Lost tag"],
  ["on-won", "won", "the Won tag"],
  ["on-sidebar", "sidebar", "sidebar text"],
  ["sidebar-muted", "sidebar", "the sidebar footer text"],
  ["on-float", "float", "toasts and chart tooltips"],
  ["axis", "panel", "chart labels"],
  ["white", "alert-solid", "destructive buttons"],
  ["white", "info-solid", "the New block"],
  ["primary-text", "primary-tint", "Customer tag and done follow-ups"],
  ["primary-text", "panel", "text in the darker green"],
  ["info-text", "info-tint", "Lead tag and call icons"],
  ["info-text", "panel", "links"],
  ["alert-text", "alert-tint", "Late and overdue"],
  ["alert-text", "panel", "overdue figures"],
  ["marigold-text", "marigold-tint", "Qualified tag and email icons"],
  ["coral-text", "coral-tint", "Proposal tag"],
];

const colour = (mode: Mode, name: string) =>
  name === "white" ? "#ffffff" : tokenIn(mode, name);

describe.each<Mode>(["light", "dark"])("colour contrast in %s mode", (mode) => {
  it.each(PAIRS)("%s on %s passes 4.5:1 (%s)", (fg, bg) => {
    expect(ratio(colour(mode, fg), colour(mode, bg))).toBeGreaterThanOrEqual(
      4.5,
    );
  });
  it("secondary text on the pipeline lanes passes 4.5:1", () => {
    expect(ratio(tokenIn(mode, "muted"), lane(mode))).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});

describe("stage dots in dark mode", () => {
  it.each(["panel", "page"])("the Lost dot is 3:1 or more on the %s", (bg) => {
    expect(
      ratio(tokenIn("dark", "lost-dot"), tokenIn("dark", bg)),
    ).toBeGreaterThanOrEqual(3);
  });
});

describe("light mode keeps its colours", () => {
  it.each([
    ["page", "#f0f4f5"],
    ["panel", "#ffffff"],
    ["ink", "#073b4c"],
    ["muted", "#42697a"],
    ["soft", "#e6edef"],
  ])("--%s is %s", (name, value) => {
    expect(tokenIn("light", name)).toBe(value);
  });
});
