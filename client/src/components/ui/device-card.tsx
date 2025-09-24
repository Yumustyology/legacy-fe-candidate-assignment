import { FC } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Trash2 } from "lucide-react";

interface DeviceCardProps {
  device: {
    id: string;
    type?: string;
    createdAt?: string;
    verified?: boolean;
  };
  isLoading: boolean;
  onRemove: (deviceId: string) => void;
}

const DeviceCard: FC<DeviceCardProps> = ({ device, isLoading, onRemove }) => {
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Smartphone className="h-5 w-5 text-green-600" />
          <div>
            <p className="font-medium">{device.type || device.id || "MFA Device"}</p>
            <p className="text-sm text-muted-foreground">
              Added {device.createdAt ? new Date(device.createdAt).toLocaleDateString() : "Unknown"}
            </p>
          </div>
          <Badge
            variant="secondary"
            className={`bg-${device.verified ? "green" : "gray"}-100 text-${device.verified ? "green" : "gray"}-800`}
          >
            {device.verified ? "Verified" : "Unverified"}
          </Badge>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onRemove(device.id)}
          disabled={isLoading}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default DeviceCard;