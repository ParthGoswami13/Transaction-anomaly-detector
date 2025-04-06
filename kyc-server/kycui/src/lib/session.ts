const isLocalStorageAvailable = () => {
    return typeof window !== "undefined" && window.localStorage;
  };
  
  const getSession = (key: string): string | null => {
    if (isLocalStorageAvailable()) {
      return localStorage.getItem(key);
    }
    return null;
  };
  
  const setSession = (key: string, value: string): void => {
    if (isLocalStorageAvailable()) {
      localStorage.setItem(key, value);
    }
  };
  
  const removeSession = (key: string): void => {
    if (isLocalStorageAvailable()) {
      localStorage.removeItem(key);
    }
  };
  
  const clearSession = (): void => {
    if (isLocalStorageAvailable()) {
      localStorage.clear();
    }
  };
  
  export { getSession, setSession, removeSession, clearSession };