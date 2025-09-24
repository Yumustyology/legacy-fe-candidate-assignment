import { useState, useEffect, useCallback } from "react";
import {
  useMfa,
  useIsLoggedIn,
  useDynamicContext,
} from "@dynamic-labs/sdk-react-core";

export function useMfaPromptStatus() {
  const [hasMfaDevices, setHasMfaDevices] = useState<boolean | null>(null);
  const [hasSkippedThisSession, setHasSkippedThisSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const isLoggedIn = useIsLoggedIn();
  const { user } = useDynamicContext();
  const { getUserDevices } = useMfa();

  const refreshMfaStatus = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (user?.userId) {
      setHasSkippedThisSession(false);
    }
  }, [user?.userId]);

  useEffect(() => {
    const checkMfaDevices = async () => {
      if (!isLoggedIn) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const devices = await getUserDevices();
        setHasMfaDevices(devices.length > 0);
      } catch (error) {
        console.error("Failed to check MFA devices:", error);
        setHasMfaDevices(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkMfaDevices();
  }, [isLoggedIn, getUserDevices, refreshTrigger]);

  const skipMfaForSession = () => {
    setHasSkippedThisSession(true);
  };

  const shouldShowMfaPrompt =
    isLoggedIn &&
    !isLoading &&
    hasMfaDevices === false &&
    !hasSkippedThisSession;

  return {
    shouldShowMfaPrompt,
    hasMfaDevices,
    hasSkippedThisSession,
    isLoading,
    skipMfaForSession,
    refreshMfaStatus,
  };
}
