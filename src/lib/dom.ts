/**
 * DOM helpers — textContent-only construction.
 *
 * ESLint bans `.innerHTML` / `.outerHTML` / `.insertAdjacentHTML` assignment
 * across `src/` (PLAN.md Eng E13). Use `el()` for the 99% case; for the 1%
 * where we need rich-but-safe content (mechanism prose), it pre-renders to
 * sanitized HTML at build time and lands in a dedicated component later.
 */

type AttrValue = string | number | boolean | undefined | null;
type Attrs = Record<string, AttrValue>;

type Child = Node | string | undefined | false | null;

/**
 * Create an HTML element with attributes and children.
 *
 *   el("div", { class: "wrap" }, "hello")
 *   el("button", { type: "button", "aria-label": "Close" }, "×")
 *   el("section", {}, el("h1", {}, "Title"), el("p", {}, "Body"))
 *
 * `class` is special-cased to set `className`. `style` accepts a string.
 * Boolean attribute values: true → present (no value), false/undefined/null → omitted.
 * String/number children become text nodes (safely; never parsed as HTML).
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "class") {
      node.className = String(value);
    } else if (value === true) {
      node.setAttribute(key, "");
    } else {
      node.setAttribute(key, String(value));
    }
  }
  for (const child of children) {
    if (child === undefined || child === null || child === false) continue;
    if (typeof child === "string" || typeof child === "number") {
      node.appendChild(document.createTextNode(String(child)));
    } else {
      node.appendChild(child);
    }
  }
  return node;
}

/** Create an SVG element. Mirrors el() but uses the SVG namespace. */
export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: Child[]
): SVGElementTagNameMap[K] {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, value);
  }
  for (const child of children) {
    if (child === undefined || child === null || child === false) continue;
    if (typeof child === "string" || typeof child === "number") {
      node.appendChild(document.createTextNode(String(child)));
    } else {
      node.appendChild(child);
    }
  }
  return node;
}

/** Remove all children of a node. */
export function clear(node: Node): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** Replace all children of `target` with `next` nodes. */
export function replace(target: Node, ...next: Child[]): void {
  clear(target);
  for (const child of next) {
    if (child === undefined || child === null || child === false) continue;
    if (typeof child === "string" || typeof child === "number") {
      target.appendChild(document.createTextNode(String(child)));
    } else {
      target.appendChild(child);
    }
  }
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Trap Tab focus within `container` (modal / sheet accessibility). Returns a
 * cleanup function that removes the listener. Wrapping Tab keeps keyboard users
 * inside the dialog while it's open; pair with aria-modal + Escape + restore.
 */
export function trapFocus(container: HTMLElement): () => void {
  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE),
    ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
  container.addEventListener("keydown", onKeydown);
  return () => container.removeEventListener("keydown", onKeydown);
}
