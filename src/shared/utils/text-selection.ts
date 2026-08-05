/**
 * True when there is text selected on the page right now.
 *
 * Cards that navigate on click need this: finishing a drag-select fires a
 * click on whatever element the pointer came to rest on, so without the
 * check, selecting a sentence to quote throws the reader onto another page
 * and discards the selection on the way.
 *
 * `getSelection` returns null in a few embedding contexts, which counts as
 * no selection.
 */
export function hasTextSelection(): boolean {
    return (window.getSelection()?.toString() ?? "").trim().length > 0;
}
