import { FC, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Smartphone, Plus, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsLoggedIn, useMfa } from "@dynamic-labs/sdk-react-core";
import { MFADevice } from "@dynamic-labs/sdk-api-core";
import MfaManager from "./mfa-manager-headless";

export const MfaDevicesSection: FC<{ onDeviceAdded?: () => void }> = ({
  onDeviceAdded,
}) => {
  const [userDevices, setUserDevices] = useState<MFADevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showMfaManager, setShowMfaManager] = useState(false);
  const { toast } = useToast();

  const isLogged = useIsLoggedIn();
  const { getUserDevices } = useMfa();

  const refreshUserDevices = async () => {
    try {
      setIsLoading(true);
      const devices = await getUserDevices();
      setUserDevices(devices);
    } catch (err: any) {
      console.error("Failed to fetch MFA devices:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLogged) {
      refreshUserDevices();
    }
  }, [isLogged]);

  const handleManageDevices = () => {
    setShowMfaManager(true);
  };

  const handleCloseMfaManager = () => {
    setShowMfaManager(false);
    refreshUserDevices();
    onDeviceAdded?.();
  };

  if (showMfaManager) {
    return (
      <Card className="bg-card border border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              Multi-Factor Authentication
            </h3>
            <Button variant="outline" size="sm" onClick={handleCloseMfaManager}>
              Back
            </Button>
          </div>
          <MfaManager
            onDeviceAdded={() => {
              refreshUserDevices();
              onDeviceAdded?.();
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border border-border">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="text-primary-foreground" size={16} />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Security</h3>
              <p className="text-sm text-muted-foreground">
                Multi-factor authentication devices
              </p>
            </div>
          </div>
          <Button
            onClick={handleManageDevices}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Manage</span>
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Loading devices...</p>
          </div>
        ) : userDevices.length === 0 ? (
          <div className="flex items-center justify-between p-4 border rounded-lg border-dashed">
            <div className="flex items-center space-x-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">No MFA devices</p>
                <p className="text-xs text-muted-foreground">
                  Add an authenticator for enhanced security
                </p>
              </div>
            </div>
            <Button
              onClick={handleManageDevices}
              size="sm"
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Device</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {userDevices.slice(0, 2).map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <Smartphone className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">
                      {" "}
                      {device.type || device.id || "MFA Device"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Added{" "}
                      {device.createdAt
                        ? new Date(device.createdAt).toLocaleDateString()
                        : "Unknown date"}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800 text-xs"
                >
                  Active
                </Badge>
              </div>
            ))}

            {userDevices.length > 2 && (
              <div className="text-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleManageDevices}
                  className="text-xs"
                >
                  +{userDevices.length - 2} more devices
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MfaDevicesSection;
