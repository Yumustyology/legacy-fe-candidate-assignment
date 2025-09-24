import { FC, useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Shield,
  Smartphone,
  Copy,
  Trash2,
  Key,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useDynamicContext,
  useIsLoggedIn,
  useMfa,
  useSyncMfaFlow,
} from "@dynamic-labs/sdk-react-core";
import { MFADevice } from "@dynamic-labs/sdk-api-core";
import QRCodeUtil from "qrcode";
import DeviceCard from "@/components/ui/device-card";

type MfaRegisterData = {
  uri: string;
  secret: string;
};

type ViewState =
  | "devices"
  | "qr-code"
  | "otp"
  | "backup-codes"
  | "remove-device";

type MfaManagerProps = {
  onDeviceAdded?: () => void;
  onClose?: () => void;
};

export const MfaManager: FC<MfaManagerProps> = ({ onDeviceAdded, onClose }) => {
  const [userDevices, setUserDevices] = useState<MFADevice[]>([]);
  const [mfaRegisterData, setMfaRegisterData] = useState<MfaRegisterData>();
  const [currentView, setCurrentView] = useState<ViewState>("devices");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [otpCode, setOtpCode] = useState("");
  const [deviceToRemove, setDeviceToRemove] = useState<string | null>(null);
  const [removeOtpCode, setRemoveOtpCode] = useState("");
  const [requiresBackupCodes, setRequiresBackupCodes] = useState(false);

  const qrCodeRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const isLogged = useIsLoggedIn();
  const {
    addDevice,
    authenticateDevice,
    getUserDevices,
    getRecoveryCodes,
    completeAcknowledgement,
    deleteUserDevice,
  } = useMfa();
  const { userWithMissingInfo } = useDynamicContext();

  const refreshUserDevices = async () => {
    try {
      setIsLoading(true);
      const devices = await getUserDevices();
      setUserDevices(devices);

      if (devices.length > 0) {
        setCurrentView("devices");
      }
    } catch (err: any) {
      console.error("Failed to refresh devices:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLogged) {
      refreshUserDevices();
    }
  }, [isLogged]);

  useEffect(() => {
    if (mfaRegisterData?.uri) {
      QRCodeUtil.toDataURL(mfaRegisterData.uri)
        .then(setQrCodeDataUrl)
        .catch(console.error);
    }
  }, [mfaRegisterData]);

  useSyncMfaFlow({
    handler: async () => {
      console.log("MFA Flow triggered by useSyncMfaFlow");

      if (userWithMissingInfo?.scope?.includes("requiresAdditionalAuth")) {
        const devices = await getUserDevices();
        if (devices.length === 0) {
          console.log("No MFA devices found, starting device setup");
          setError(undefined);
          try {
            const { uri, secret } = await addDevice();
            setMfaRegisterData({ secret, uri });
            setCurrentView("qr-code");
          } catch (err: any) {
            console.error("Failed to add device:", err);
            setError(err.message);
          }
        } else {
          console.log("MFA device found, prompting for OTP");
          setError(undefined);
          setMfaRegisterData(undefined);
        }
      } else if (isLogged) {
        console.log("MFA complete, showing devices");
        setCurrentView("devices");
        await refreshUserDevices();
      }
    },
  });

  const onAddDevice = async () => {
    try {
      setError(undefined);
      setIsLoading(true);
      console.log("Adding new MFA device");

      const { uri, secret } = await addDevice();
      setMfaRegisterData({ secret, uri });
      setCurrentView("qr-code");

      console.log("Device setup initiated, showing QR code");
    } catch (err: any) {
      console.error("Failed to add device:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const onOtpSubmit = async (code: string) => {
    try {
      setIsLoading(true);
      setError(undefined);
      console.log("Authenticating device with OTP");

      await authenticateDevice({ code });
      console.log("Device authenticated successfully");

      const codes = await getRecoveryCodes(true);
      setBackupCodes(codes);
      setCurrentView("backup-codes");

      toast({
        title: "MFA Device Added",
        description: "Now you must generate backup codes to complete setup.",
      });
    } catch (err: any) {
      console.error("Device authentication failed:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateBackupCodes = async () => {
    try {
      setIsLoading(true);
      setError(undefined);

      console.log("Generating backup codes (headless)");

      const codes = await getRecoveryCodes(true);

      console.log("Backup codes received:", codes?.length || 0, "codes");

      setBackupCodes(codes);
      setCurrentView("backup-codes");

      setRequiresBackupCodes(false);

      await refreshUserDevices();

      toast({
        title: "Backup Codes Generated",
        description: "Your backup recovery codes have been generated.",
      });
    } catch (err: any) {
      console.error("Backup codes generation failed:", err);
      setError(err.message || "Failed to generate backup codes");
      toast({
        title: "Error",
        description:
          err.message || "Failed to generate backup codes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string, code: string) => {
    try {
      setIsLoading(true);

      const mfaAuthToken = await authenticateDevice({
        code,
        deviceId,
        createMfaToken: { singleUse: true },
      });

      if (typeof mfaAuthToken === "string") {
        await deleteUserDevice(deviceId, mfaAuthToken);
        await refreshUserDevices();
      } else {
        throw new Error("Failed to authenticate device for removal.");
      }

      setDeviceToRemove(null);
      setRemoveOtpCode("");
      setCurrentView("devices");

      toast({
        title: "Device Removed",
        description: "MFA device has been removed from your account.",
      });
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join("\\n"));
      toast({
        title: "Backup Codes Copied",
        description: "Backup codes have been copied to your clipboard.",
      });
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy backup codes to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleCompleteBackupCodes = async () => {
    try {
      await completeAcknowledgement();

      setCurrentView("devices");
      setBackupCodes([]);
      setMfaRegisterData(undefined);
      setRequiresBackupCodes(false);

      setIsLoading(true);
      await refreshUserDevices();
      setIsLoading(false);

      onDeviceAdded?.();
      onClose?.();

      toast({
        title: "MFA Setup Complete",
        description:
          "Your account is now secured with Multi-Factor Authentication.",
        variant: "default",
      });
    } catch (err: any) {
      console.error("Failed to complete MFA setup:", err);
      setError(err.message);
    }
  };

  const renderDevicesView = () => {
    const generateNewCodes = async () => {
      try {
        setIsLoading(true);
        const codes = await getRecoveryCodes(true);
        setBackupCodes(codes);
        setCurrentView("backup-codes");
        toast({
          title: "New Recovery Codes Generated",
          description: "Your recovery codes have been updated.",
        });
      } catch (err: any) {
        console.error("Failed to generate new recovery codes:", err);
        toast({
          title: "Error",
          description:
            "Failed to generate new recovery codes. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    const removeDevice = (deviceId: string) => {
      setDeviceToRemove(deviceId);
      setCurrentView("remove-device");
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              Multi-Factor Authentication
            </h3>
            <p className="text-sm text-muted-foreground">
              Secure your account with TOTP authenticator apps
            </p>
          </div>
          {userDevices.length === 0 && (
            <Button onClick={onAddDevice} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Smartphone className="mr-2 h-4 w-4" />
                  Add Device
                </>
              )}
            </Button>
          )}
        </div>

        {userDevices.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No MFA devices configured</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add an authenticator device to enhance your account security
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {userDevices.map((device) =>
              device.id ? (
                <DeviceCard
                  key={device.id}
                  device={
                    device as {
                      id: string;
                      type?: string;
                      createdAt?: string;
                      verified?: boolean;
                    }
                  }
                  isLoading={isLoading}
                  onRemove={(deviceId) => removeDevice(deviceId)}
                />
              ) : (
                <div key={Math.random()} className="text-red-500">
                  Invalid device data
                </div>
              )
            )}
          </div>
        )}

        {userDevices?.length ? (
          <Button
            onClick={generateNewCodes}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Recovery Codes...
              </>
            ) : (
              <>
                <Key className="mr-2 h-4 w-4" />
                Generate New Recovery Codes
              </>
            )}
          </Button>
        ) : null}
      </div>
    );
  };

  const renderQrCodeView = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Smartphone className="mx-auto h-12 w-12 text-primary mb-4" />
        <h3 className="text-lg font-semibold mb-2">Set Up Authenticator</h3>
        <p className="text-sm text-muted-foreground">
          Scan this QR code with your authenticator app (Google Authenticator,
          Authy, etc.)
        </p>
      </div>

      {qrCodeDataUrl && (
        <div className="flex justify-center">
          <div className="p-4 bg-white rounded-lg">
            <img src={qrCodeDataUrl} alt="MFA QR Code" className="w-48 h-48" />
          </div>
        </div>
      )}

      {mfaRegisterData?.secret && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Manual Entry Code:</p>
          <div className="flex items-center space-x-2">
            <Input
              value={mfaRegisterData.secret}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(mfaRegisterData.secret);
                toast({
                  title: "Copied",
                  description: "Secret copied to clipboard",
                });
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Input
          placeholder="Enter 6-digit code from your app"
          value={otpCode}
          onChange={(e) => setOtpCode(e.target.value)}
          maxLength={6}
          className="text-center text-lg tracking-widest"
        />
        <div className="flex space-x-3">
          <Button
            onClick={() => onOtpSubmit(otpCode)}
            disabled={isLoading || otpCode.length !== 6}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Verify & Enable
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentView("devices")}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );

  const renderBackupCodesView = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Backup Codes Generated</h3>
        <p className="text-sm text-muted-foreground">
          Save these backup codes in a secure location. You can use them to
          access your account if you lose your device.
        </p>
      </div>

      <div className="bg-muted p-4 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <p className="font-medium">Backup Recovery Codes</p>
          <Button variant="outline" size="sm" onClick={copyBackupCodes}>
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 font-mono text-sm">
          {backupCodes.map((code, index) => (
            <div key={index} className="p-2 bg-background rounded border">
              {code}
            </div>
          ))}
        </div>
      </div>

      <Button onClick={handleCompleteBackupCodes} className="w-full">
        Complete MFA Setup
      </Button>
    </div>
  );

  const renderRemoveDeviceView = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Trash2 className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Remove Device</h3>
        <p className="text-sm text-muted-foreground">
          Enter the OTP code from your authenticator app to confirm device
          removal.
        </p>
      </div>

      <Input
        placeholder="Enter 6-digit OTP code"
        value={removeOtpCode}
        onChange={(e) => setRemoveOtpCode(e.target.value)}
        maxLength={6}
        className="text-center text-lg tracking-widest"
      />

      <div className="flex space-x-3">
        <Button
          onClick={() => handleRemoveDevice(deviceToRemove!, removeOtpCode)}
          disabled={isLoading || removeOtpCode.length !== 6}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Removing...
            </>
          ) : (
            "Remove Device"
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => setCurrentView("devices")}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  useEffect(() => {
    return () => {
      if (currentView === "backup-codes") {
        console.log("Cleaning up: Completing acknowledgement for backup codes");
        completeAcknowledgement().catch((err) => {
          console.error(
            "Failed to complete acknowledgement during cleanup:",
            err
          );
        });
      }
    };
  }, [currentView]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {currentView === "devices" && renderDevicesView()}
        {currentView === "qr-code" && renderQrCodeView()}
        {/* {currentView === "otp" && renderOtpView()} */}
        {currentView === "backup-codes" && renderBackupCodesView()}
        {currentView === "remove-device" && renderRemoveDeviceView()}
      </CardContent>
    </Card>
  );
};

export default MfaManager;
