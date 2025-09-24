import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import WalletConnectorWithOTP from "@/components/wallet-connector-with-otp";
import { MessageSigner } from "@/components/message-signer";
import { SignatureResult } from "@/components/signature-result";
import { MessageHistory } from "@/components/message-history";
import MfaDevicesSection from "@/components/mfa-devices-section";
import MfaPersistentPrompt from "@/components/mfa-persistent-prompt";
import { useApiStatus } from "@/hooks/use-api-status";
import { useToast } from "@/hooks/use-toast";
import { useMfaPromptStatus } from "@/hooks/use-mfa-prompt-status";
import {
  useDynamicContext,
} from "@dynamic-labs/sdk-react-core";

interface SignedMessage {
  message: string;
  signature: string;
  signerAddress: string;
}

export default function Home() {
  const { user, handleLogOut } = useDynamicContext();
  const { isOnline, isOffline, isLoading } = useApiStatus();
  const { toast } = useToast();
  const { shouldShowMfaPrompt, skipMfaForSession, refreshMfaStatus } = useMfaPromptStatus();

  const [mfaRefreshTrigger, setMfaRefreshTrigger] = useState(0);
  const [signedMessage, setSignedMessage] = useState<SignedMessage | null>(
    null
  );

  const handleMessageSigned = (
    message: string,
    signature: string,
    signerAddress: string
  ) => {
    setSignedMessage({ message, signature, signerAddress });
  };

  const handleRefreshMfa = () => {
    refreshMfaStatus();
    setMfaRefreshTrigger(prev => prev + 1);
  };

  const handleCloseSignatureResult = () => {
    setSignedMessage(null);
  };

  const handleDisconnect = async () => {
    try {
      await handleLogOut();
      setSignedMessage(null);
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

  if (!user?.email) {
    return <WalletConnectorWithOTP />;
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <div className="bg-card border-b border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Message Signer</h2>
              <p className="text-muted-foreground">
                Create cryptographic signatures for your messages
              </p>
            </div>
            <div>
              <h2 className="text-sm text-right mb-2 font-bold">
                {user?.email}
              </h2>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div 
                    className={`w-2 h-2 rounded-full ${
                      isLoading 
                        ? "bg-yellow-400 animate-pulse" 
                        : isOnline 
                        ? "bg-green-400 animate-pulse" 
                        : "bg-red-400"
                    }`}
                  ></div>
                  <span className="text-sm text-muted-foreground">
                    {isLoading 
                      ? "Connecting..." 
                      : isOnline 
                      ? "API Online" 
                      : "API Offline"
                    }
                  </span>
                </div>
                <Button
                  onClick={handleDisconnect}
                  variant="destructive"
                  size="sm"
                  data-testid="button-disconnect-top"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-8">
            {shouldShowMfaPrompt && (
              <MfaPersistentPrompt 
                onSkip={skipMfaForSession} 
                refreshTrigger={mfaRefreshTrigger} 
              />
            )}
            
            <MessageSigner onMessageSigned={handleMessageSigned} />

            {signedMessage && (
              <SignatureResult
                message={signedMessage.message}
                signature={signedMessage.signature}
                signerAddress={signedMessage.signerAddress}
                onClose={handleCloseSignatureResult}
              />
            )}

            <MessageHistory />

            <MfaDevicesSection onDeviceAdded={handleRefreshMfa} />
          </div>
        </div>
      </div>
    </div>
  );
}
