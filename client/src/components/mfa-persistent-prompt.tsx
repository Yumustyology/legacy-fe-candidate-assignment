import { FC, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, X, ArrowRight } from "lucide-react";
import { useMfa, useIsLoggedIn, useDynamicContext } from "@dynamic-labs/sdk-react-core";
import MfaManager from "./mfa-manager-headless";

const BACKUP_CODES_STORAGE_KEY = "mfa_backup_codes_generated";

const hasBackupCodesGenerated = (userId: string): boolean => {
  const generated = localStorage.getItem(`${BACKUP_CODES_STORAGE_KEY}_${userId}`);
  return generated === "true";
};

interface MfaPersistentPromptProps {
  onSkip: () => void;
  refreshTrigger?: number;
}

export const MfaPersistentPrompt: FC<MfaPersistentPromptProps> = ({ onSkip, refreshTrigger }) => {
  const [userDevices, setUserDevices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [hasMfaDevices, setHasMfaDevices] = useState(false);
  const [requiresBackupCodes, setRequiresBackupCodes] = useState(false);

  const isLoggedIn = useIsLoggedIn();
  const { getUserDevices } = useMfa();
  const { userWithMissingInfo } = useDynamicContext();

  useEffect(() => {
    const checkMfaDevices = async () => {
      if (!isLoggedIn) return;

      try {
        setIsLoading(true);
        const devices = await getUserDevices();
        setUserDevices(devices);
        setHasMfaDevices(devices.length > 0);

        if (devices.length > 0 && userWithMissingInfo?.userId) {
          const hasBackupCodes = hasBackupCodesGenerated(userWithMissingInfo.userId);
          setRequiresBackupCodes(!hasBackupCodes);
        }
      } catch (error) {
        console.error("Failed to check MFA devices:", error);
        setHasMfaDevices(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkMfaDevices();
  }, [isLoggedIn, getUserDevices, refreshTrigger, userWithMissingInfo]);


  if (showMfaSetup) {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="border border-white w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Shield className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Set Up Multi-Factor Authentication</h3>
                  <p className="text-sm text-muted-foreground">
                    Secure your wallet with an additional layer of protection
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMfaSetup(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <MfaManager 
              onDeviceAdded={() => {
                setHasMfaDevices(true);
                setRequiresBackupCodes(false);
                setShowMfaSetup(false);
                onSkip();
              }}
              onClose={() => setShowMfaSetup(false)}
            />
            
            {!requiresBackupCodes && (
              <div className="mt-6 pt-4 border-t">
                <Button
                  onClick={onSkip}
                  variant="ghost"
                  className="w-full border border-white text-muted-foreground"
                >
                  Skip for now (I'll set this up later)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield className="text-blue-600" size={24} />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 mb-1">
              🔐 Secure Your Wallet
            </h4>
            <p className="text-blue-700 text-sm mb-3">
              Add an extra layer of security to protect your wallet and signatures. 
              Multi-factor authentication helps prevent unauthorized access.
            </p>
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => setShowMfaSetup(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <Shield className="mr-2 h-4 w-4" />
                Set Up MFA Now
              </Button>
              <Button
                onClick={onSkip}
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Skip This Time
              </Button>
            </div>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className="text-blue-400 hover:text-blue-600 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default MfaPersistentPrompt;