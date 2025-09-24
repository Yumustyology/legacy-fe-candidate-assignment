import { FC, useEffect, useState } from "react";
import {
  useDynamicContext,
  useIsLoggedIn,
  useMfa,
  useSyncMfaFlow,
} from "@dynamic-labs/sdk-react-core";
import { MFADevice } from "@dynamic-labs/sdk-api-core";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface MfaAuthenticatorProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const OTPView: FC<{ onSubmit: (code: string) => Promise<void> }> = ({ onSubmit }) => {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 6) {
      setIsLoading(true);
      await onSubmit(code);
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Enter Authentication Code</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          maxLength={6}
          className="text-center  border-white text-2xl tracking-widest font-mono w-full p-4 bg-input border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="[0-9]*"
          autoFocus
        />
        <Button 
          type="submit" 
          disabled={isLoading || code.length !== 6}
          className="w-full"
        >
          {isLoading ? "Authenticating..." : "Authenticate"}
        </Button>
      </form>
    </div>
  );
};

export const MfaAuthenticator: FC<MfaAuthenticatorProps> = ({
  onSuccess,
  onError,
}) => {
  const [userDevices, setUserDevices] = useState<MFADevice[]>([]);
  const [currentView, setCurrentView] = useState<string>("otp");
  const [error, setError] = useState<string>();

  const { toast } = useToast();
  const isLogged = useIsLoggedIn();
  const {
    authenticateDevice,
    getUserDevices,
  } = useMfa();
  const { userWithMissingInfo } = useDynamicContext();

  const refreshUserDevices = async () => {
    const devices = await getUserDevices();
    setUserDevices(devices);
  };

  useEffect(() => {
      refreshUserDevices();
  }, [isLogged]);

   useSyncMfaFlow({
    handler: async () => {
      const devices = await getUserDevices();
      if (userWithMissingInfo?.scope?.includes("requiresAdditionalAuth")) {
        if (devices.length === 0 && userDevices.length === 0) {
          console.log("No MFA devices found");
          setError("No MFA devices found. Please set up MFA first.");
          onError?.("No MFA devices found");
        } else {
          console.log("MFA device found, prompting for OTP");
          setError(undefined);
          setCurrentView("otp");
        }
      } else {}
    },
  });

  const onOtpSubmit = async (code: string) => {
    try {
      await authenticateDevice({ code });
      
      toast({
        title: "Authentication Successful",
        description: "You have been successfully authenticated with MFA.",
        variant: "default",
      });

      onSuccess?.();
    } catch (e: any) {
      console.error("Authentication failed:", e);
      setError(e.message);
      onError?.(e.message);
      
      toast({
        title: "Authentication Failed", 
        description: e.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="totp-mfa" style={{ padding: "20px", maxWidth: "400px", margin: "0 auto" }}>
      {error && (
        <div className="error" style={{ 
          backgroundColor: "#fee", 
          border: "1px solid #fcc", 
          padding: "10px", 
          borderRadius: "4px",
          marginBottom: "20px",
          color: "#c33"
        }}>
          {error}
        </div>
      )}
          
        <OTPView onSubmit={onOtpSubmit} />
    </div>
  );
};

export default MfaAuthenticator;