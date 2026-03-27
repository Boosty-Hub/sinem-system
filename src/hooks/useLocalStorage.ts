import { useState, useEffect, useCallback, useRef } from "react";

export function useLocalStorage<T>(key: string, initialValue: T, migrate?: (stored: T) => T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const initialRef = useRef(initialValue);
  const migrateRef = useRef(migrate);
  migrateRef.current = migrate;

  const read = useCallback((): T => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return initialRef.current;
      const parsed = JSON.parse(stored) as T;
      return migrateRef.current ? migrateRef.current(parsed) : parsed;
    } catch {
      return initialRef.current;
    }
  }, [key]);

  const [value, setValue] = useState<T>(read);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable
    }
  }, [key, value]);

  // Sync across components / tabs when another instance writes to the same key
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) setValue(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key, read]);

  // Also re-read on mount in case data changed while component was unmounted
  useEffect(() => {
    setValue(read());
  }, [key, read]);

  return [value, setValue];
}
