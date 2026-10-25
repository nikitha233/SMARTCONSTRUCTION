import { useCallback, useEffect, useState } from 'react';

export function useApi(fetcher, { enabled = true, initialData = null, clearOnLoad = false } = {}) {
    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState(null);
    const [requestVersion, setRequestVersion] = useState(0);

    const refetch = useCallback(() => setRequestVersion(version => version + 1), []);

    useEffect(() => {
        if (!enabled) return undefined;
        const controller = new AbortController();
        Promise.resolve().then(async () => {
            setLoading(true);
            setError(null);
            if (clearOnLoad) setData(initialData);
            try {
                const result = await fetcher(controller.signal);
                if (!controller.signal.aborted) setData(result);
            } catch (requestError) {
                if (!controller.signal.aborted) setError(requestError);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        });
        return () => controller.abort();
    }, [clearOnLoad, enabled, fetcher, initialData, requestVersion]);

    return { data, setData, loading, error, refetch };
}
