import { useCallback, useEffect, useRef } from 'react';

export function useRequestController() {
    const controllersRef = useRef(new Set());

    const createController = useCallback(() => {
        const controller = new AbortController();
        controllersRef.current.add(controller);
        controller.signal.addEventListener('abort', () => controllersRef.current.delete(controller), { once: true });
        return controller;
    }, []);

    useEffect(() => () => {
        controllersRef.current.forEach(controller => controller.abort());
        controllersRef.current.clear();
    }, []);

    return createController;
}
