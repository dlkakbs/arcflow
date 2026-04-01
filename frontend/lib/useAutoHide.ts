import { useEffect, useState } from "react";

export function useAutoHide(trigger: boolean, delay = 5000) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (trigger) {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), delay);
      return () => clearTimeout(t);
    }
  }, [trigger, delay]);
  return visible;
}
