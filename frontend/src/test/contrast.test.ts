import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  resolve(process.cwd(), "src/theme/tokens.css"),
  "utf8",
);
const token = (name: string): string => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token --${name} not found`);
  return m[1];
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
/** The lane colour is Sea Mist at 40% over the page colour. */
function lane(): string {
  const f = token("mist");
  const p = token("page");
  const mix = [1, 3, 5].map((i) =>
    Math.round(
      parseInt(f.slice(i, i + 2), 16) * 0.4 +
        parseInt(p.slice(i, i + 2), 16) * 0.6,
    ),
  );
  return "#" + mix.map((v) => v.toString(16).padStart(2, "0")).join("");
}

// Every text and background pairing the app uses for small text. Each must pass 4.5:1.
const PAIRS: [string, string, string][] = [
  ["muted", "panel", "secondary text on panels"],
  ["muted", "page", "secondary text on the page"],
  ["muted", "soft", "secondary text on pills and stat boxes"],
  ["ink", "primary", "primary buttons and the Negotiation block"],
  ["ink", "secondary", "the Qualified block"],
  ["ink", "tertiary", "the Proposal block"],
  ["ink", "mist", "the Lost tag"],
  ["mist", "ink", "sidebar text"],
  ["panel", "ink", "the Won tag"],
  ["panel", "alert-text", "destructive buttons"],
  ["panel", "info-text", "the New block"],
  ["primary-text", "primary-tint", "Customer tag and done follow-ups"],
  ["primary-text", "panel", "text in the darker green"],
  ["info-text", "info-tint", "Lead tag and call icons"],
  ["info-text", "panel", "links"],
  ["alert-text", "alert-tint", "Late and overdue"],
  ["alert-text", "panel", "overdue figures"],
  ["marigold-text", "marigold-tint", "Qualified tag and email icons"],
  ["coral-text", "coral-tint", "Proposal tag"],
];

describe("colour contrast", () => {
  it.each(PAIRS)("%s on %s passes 4.5:1 (%s)", (fg, bg) => {
    expect(ratio(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
  });
  it("secondary text on the pipeline lanes passes 4.5:1", () => {
    expect(ratio(token("muted"), lane())).toBeGreaterThanOrEqual(4.5);
  });
  it("the sidebar footer text passes 4.5:1", () => {
    expect(ratio("#8fa9b2", token("ink"))).toBeGreaterThanOrEqual(4.5);
  });
});
