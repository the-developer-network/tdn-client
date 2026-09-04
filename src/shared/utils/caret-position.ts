/**
 * Where the caret sits inside a textarea, in the textarea's own coordinates.
 *
 * A textarea exposes no caret geometry, so the only reliable way to ask is to
 * build a hidden element with the *same* typography, put the text up to the
 * caret into it, and read where that text ends.
 */
export interface CaretPoint {
    /** Distance from the top of the field to the top of the caret's line. */
    top: number;
    left: number;
    /** One line of text, so a caller can place something under that line. */
    lineHeight: number;
}

/**
 * Every property that changes where a character lands.
 *
 * Copied wholesale rather than hand-picked. The four composers do not share a
 * typography — the post box is 15px and the article editor 18px, with
 * different padding and line heights — and a single property left behind
 * shifts the measurement silently, which shows up as a list that is *almost*
 * in the right place and is far harder to notice than one that is obviously
 * wrong.
 */
const MIRRORED = [
    "boxSizing",
    "width",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "fontStyle",
    "fontVariant",
    "fontWeight",
    "fontStretch",
    "fontSize",
    "fontSizeAdjust",
    "fontFamily",
    "lineHeight",
    "letterSpacing",
    "wordSpacing",
    "textTransform",
    "textIndent",
    "textRendering",
    "tabSize",
] as const;

/**
 * `line-height: normal` computes to the string rather than a length in some
 * browsers, and there is nothing to parse. 1.2 is what "normal" resolves to
 * closely enough for placing a list one line down.
 */
function resolveLineHeight(style: CSSStyleDeclaration): number {
    const parsed = Number.parseFloat(style.lineHeight);
    if (!Number.isNaN(parsed)) return parsed;
    return Number.parseFloat(style.fontSize) * 1.2;
}

export function getCaretPoint(
    el: HTMLTextAreaElement,
    caret: number = el.selectionStart ?? el.value.length,
): CaretPoint {
    const style = window.getComputedStyle(el);
    const mirror = document.createElement("div");

    for (const property of MIRRORED) {
        mirror.style[property] = style[property];
    }

    // The field wraps and scrolls; the mirror wraps the same way and grows
    // instead, so the full text is laid out and can be measured.
    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.whiteSpace = "pre-wrap";
    mirror.style.overflowWrap = "break-word";
    mirror.style.top = "0";
    mirror.style.left = "0";

    // A text node, never innerHTML: the value is somebody's post, and this
    // element is in the document while it is measured.
    mirror.appendChild(document.createTextNode(el.value.slice(0, caret)));

    // Zero-width, so it marks the caret without moving what precedes it. The
    // non-breaking space gives it a box to measure when the caret sits at the
    // end of a line, where an empty span collapses.
    const marker = document.createElement("span");
    marker.appendChild(document.createTextNode("​"));
    mirror.appendChild(marker);

    document.body.appendChild(mirror);
    const top = marker.offsetTop;
    const left = marker.offsetLeft;
    document.body.removeChild(mirror);

    return {
        // The field scrolls independently of the mirror, which is why the
        // article editor's eighteen rows would otherwise drift as they scroll.
        top: top - el.scrollTop,
        left: left - el.scrollLeft,
        lineHeight: resolveLineHeight(style),
    };
}

export interface PlacementInput {
    point: CaretPoint;
    /** The field's box, in viewport coordinates. */
    field: { top: number; left: number; width: number };
    listWidth: number;
    listHeight: number;
    viewportHeight: number;
}

export interface Placement {
    /** Both relative to the field, for an absolutely positioned child. */
    top: number;
    left: number;
    /** Opened upwards because there was no room below. */
    flipped: boolean;
}

/**
 * Where the list goes, given what has been measured.
 *
 * Separated from the measuring because this half is arithmetic and can be
 * tested without a browser — jsdom reports every element as 0×0, so the mirror
 * itself can only be checked end to end.
 *
 * Horizontally the list is kept inside the field: past its right edge it is
 * pulled left, and a field narrower than the list simply starts at 0 and lets
 * `max-width` do the rest. That is the phone case, and there the list spanning
 * the field is what is wanted anyway.
 *
 * Vertically it prefers the line below the caret and flips above it when the
 * viewport has no room — on a phone the keyboard takes half the screen, so
 * that is the ordinary case rather than an edge one.
 */
export function placeList({
    point,
    field,
    listWidth,
    listHeight,
    viewportHeight,
}: PlacementInput): Placement {
    const below = point.top + point.lineHeight;
    const spaceBelow = viewportHeight - (field.top + below);
    const flipped =
        spaceBelow < listHeight && field.top + point.top > listHeight;

    return {
        top: flipped ? point.top - listHeight : below,
        left: Math.max(0, Math.min(point.left, field.width - listWidth)),
        flipped,
    };
}
