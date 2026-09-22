// Generation Manager: Tracks in-flight project generations to enable immediate stop/cancellation.

const activeGenerations = new Map<string, AbortController>();

/**
 * Register an active generation for a project.
 */
export function registerGeneration(projectId: string | { toString(): string }): AbortController {
    const controller = new AbortController();
    activeGenerations.set(projectId.toString(), controller);
    return controller;
}

/**
 * Check if a project's generation has been aborted.
 */
export function isGenerationAborted(projectId: string | { toString(): string }): boolean {
    const controller = activeGenerations.get(projectId.toString());
    return controller ? controller.signal.aborted : false;
}

/**
 * Stop/Abort an in-flight generation.
 * @returns true if an active generation was aborted, false otherwise
 */
export function abortGeneration(projectId: string | { toString(): string }): boolean {
    const controller = activeGenerations.get(projectId.toString());
    if (controller) {
        controller.abort();
        activeGenerations.delete(projectId.toString());
        return true;
    }
    return false;
}

/**
 * Clean up active generation after completion or failure.
 */
export function cleanupGeneration(projectId: string | { toString(): string }): void {
    activeGenerations.delete(projectId.toString());
}
