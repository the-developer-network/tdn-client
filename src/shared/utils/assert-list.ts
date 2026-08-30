/**
 * Rejects a list payload that is not a list, before it becomes state.
 *
 * Every list endpoint answers `{ data: [...] }` and `apiClient` unwraps it, so
 * the typed thunks promise an array. A proxy, an outage or a mis-shaped
 * handler can still put `null` — or an object — where the array belongs, and
 * the type says nothing about it at runtime.
 *
 * The tempting shape is to commit the value and let the next line throw on
 * `.length`. It does throw, and the caller's `catch` does show the error, but
 * the state is by then already holding a `null` the rest of the app believes
 * is an array: the crash resurfaces somewhere else entirely — on the next
 * render, or at unmount, where it takes the whole route down with it.
 *
 * Called *before* the first `set`, the failure stays inside the request that
 * caused it, where there is already an error state with a retry.
 */
export function assertList<T>(value: T[]): void {
    if (!Array.isArray(value)) {
        throw new Error("Expected a list from the API.");
    }
}
