import { useEffect, useMemo, useSyncExternalStore } from "react";

function createAutoHideStore(delay: number) {
  let visible = false;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<() => void>();

  const emit = () => {
    listeners.forEach((listener) => listener());
  };

  const clear = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return visible;
    },
    show() {
      clear();
      visible = true;
      emit();
      timeout = setTimeout(() => {
        visible = false;
        timeout = null;
        emit();
      }, delay);
    },
    hide() {
      clear();
      if (visible) {
        visible = false;
        emit();
      }
    },
  };
}

export function useAutoHide(trigger: boolean, delay = 5000) {
  const store = useMemo(() => createAutoHideStore(delay), [delay]);

  useEffect(() => {
    if (trigger) {
      store.show();
      return () => store.hide();
    }

    store.hide();
    return undefined;
  }, [store, trigger]);

  return useSyncExternalStore(store.subscribe, store.getSnapshot, () => false);
}
