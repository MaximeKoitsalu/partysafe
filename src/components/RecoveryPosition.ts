/**
 * Recovery-position diagram — original schematic (PLAN.md Design M7 / Eng E22).
 *
 * Drawn from scratch as a simple line schematic so it carries no third-party
 * license obligations. Released under the project's CC BY-SA. A schematic, not
 * a clinical illustration — the numbered steps alongside it are the primary
 * instruction; the figure is a visual aid.
 *
 * `currentColor` is used throughout so the figure inherits the surrounding
 * text color (works in both light and dark themes).
 */

import { svg } from "../lib/dom.ts";

export function recoveryPositionFigure(): SVGSVGElement {
  const root = svg("svg", {
    viewBox: "0 0 240 120",
    width: "100%",
    height: "auto",
    role: "img",
    "aria-label":
      "Recovery position: person lying on their left side, top knee bent forward for stability, head tilted back with face angled down so the airway stays clear.",
    class: "max-w-xs text-[var(--color-fg-primary)]",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2.5",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  });

  // Ground line
  root.appendChild(
    svg("line", { x1: "10", y1: "108", x2: "230", y2: "108", "stroke-width": "1.5", opacity: "0.5" }),
  );

  // Head (tilted back, face angled toward ground so vomit drains)
  root.appendChild(svg("circle", { cx: "44", cy: "78", r: "15" }));
  // Chin/jaw line indicating head tilt
  root.appendChild(svg("path", { d: "M32 86 Q40 96 52 90" }));

  // Torso lying on side
  root.appendChild(svg("path", { d: "M58 74 Q110 62 150 78" }));
  root.appendChild(svg("path", { d: "M58 90 Q110 100 150 92" }));

  // Lower (ground-side) leg, extended
  root.appendChild(svg("path", { d: "M150 88 L196 100" }));

  // Top leg, bent at knee (stability)
  root.appendChild(svg("path", { d: "M150 82 L182 66 L196 90" }));

  // Top arm, bent so hand supports the head
  root.appendChild(svg("path", { d: "M96 70 L86 52 L66 64" }));

  return root;
}
