// Utility for safe data fetching with timeouts
interface SafeFetchResult<T, E = Error> {
    data: T | null;
    error: E | null;
    timedOut: boolean;
}

const DEFAULT_TIMEOUT_MS = 10000; // 10 seconds

export async function safeFetch<T, E = any>(
    fetchPromise: Promise<{ data: T | null; error: E | null }>,
    timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<SafeFetchResult<T, E>> {
    let timeoutHandle: ReturnType<typeof setTimeout>;

    const timeoutPromise = new Promise<SafeFetchResult<T, E>>((resolve) => {
        timeoutHandle = setTimeout(() => {
            resolve({
                data: null,
                error: new Error('Request timed out') as unknown as E,
                timedOut: true
            });
        }, timeoutMs);
    });

    try {
        const result = await Promise.race([
            fetchPromise.then(res => ({
                data: res.data,
                error: res.error,
                timedOut: false
            })),
            timeoutPromise
        ]);

        clearTimeout(timeoutHandle!);
        return result;
    } catch (error) {
        clearTimeout(timeoutHandle!);
        return {
            data: null,
            error: error as E,
            timedOut: false
        };
    }
}
