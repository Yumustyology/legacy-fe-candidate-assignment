import { useState, useEffect } from "react";
import { useMessageHistory } from "./use-message-history";

export function useApiStatus() {
  const { error, isLoading } = useMessageHistory();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const apiStatus = {
    isOnline: isOnline && !error,
    isLoading,
    hasError: !!error,
    isOffline: !isOnline || !!error,
  };

  return apiStatus;
}