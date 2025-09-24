import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LogOut,
  Copy,
  Settings,
  History,
  Shield,
  Edit,
  Signature,
} from "lucide-react";
import { EthersService } from "@/lib/ethers";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

export function Sidebar() {
  const { user, handleLogOut } = useDynamicContext();
  const address = user?.verifiedCredentials[0]?.address;

  const { toast } = useToast();
  const [network, setNetwork] = useState<string>("Unknown");

  useEffect(() => {
    const getCurrentNetwork = async () => {
      const currentNetwork = await EthersService.getCurrentNetwork();
      setNetwork(currentNetwork);
    };
    getCurrentNetwork();
  }, []);

  const copyAddress = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address);
        toast({
          title: "Address copied",
          description: "Wallet address copied to clipboard",
        });
      } catch (error) {
        toast({
          title: "Copy failed",
          description: "Failed to copy address to clipboard",
          variant: "destructive",
        });
      }
    }
  };

  const handleDisconnect = async () => {
    try {
      await handleLogOut();
      toast({
        title: "Logged out successfully",
        description: "You have been safely disconnected from your wallet.",
        variant: "default",
      });
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: "There was an issue logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Signature className="text-primary-foreground text-lg" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Web3 Signer</h1>
            <p className="text-sm text-muted-foreground">
              Message Verification Tool
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 border-b border-border">
        {user ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Wallet Status</span>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <div className="w-3 h-3 bg-success rounded-full"></div>
                  <div className="absolute inset-0 w-3 h-3 bg-success rounded-full pulse-ring"></div>
                </div>
                <span className="text-sm text-success-foreground">
                  Connected
                </span>
              </div>
            </div>

            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">
                Wallet Address
              </p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p
                      className="wallet-address text-sm font-medium cursor-help"
                      data-testid="text-wallet-address"
                    >
                      {address
                        ? EthersService.formatAddress(address)
                        : "Not connected"}
                    </p>
                  </TooltipTrigger>
                  {address && (
                    <TooltipContent>
                      <p className="font-mono text-xs">{address}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyAddress}
                className="text-xs text-primary hover:text-primary/80 mt-1 h-auto p-0"
                data-testid="button-copy-address"
              >
                <Copy className="mr-1 h-3 w-3" />
                <span>Copy</span>
              </Button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Network</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-secondary rounded-full"></div>
                <span data-testid="text-network">{network}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Wallet not connected
            </p>
          </div>
        )}
      </div>

      <div className="p-6 flex-1">
        <nav className="space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
            data-testid="nav-sign-message"
          >
            <Edit className="mr-3 h-4 w-4" />
            <span className="font-medium">Sign Message</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted/50"
            data-testid="nav-verify-signature"
          >
            <Shield className="mr-3 h-4 w-4" />
            <span>Verify Signature</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted/50"
            data-testid="nav-message-history"
          >
            <History className="mr-3 h-4 w-4" />
            <span>Message History</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted/50"
            data-testid="nav-settings"
          >
            <Settings className="mr-3 h-4 w-4" />
            <span>Settings</span>
          </Button>
        </nav>
      </div>

      <div className="p-6 border-t border-border">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Powered by</span>
          <span className="font-medium text-foreground">Dynamic.xyz</span>
        </div>
        {user && (
          <Button
            onClick={handleDisconnect}
            variant="destructive"
            size="sm"
            className="w-full mt-4"
            data-testid="button-disconnect"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect
          </Button>
        )}
      </div>
    </div>
  );
}
