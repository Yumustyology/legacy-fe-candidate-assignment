import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Signature, Pen, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

interface MessageSignerProps {
  onMessageSigned: (
    message: string,
    signature: string,
    signerAddress: string
  ) => void;
}

export function MessageSigner({ onMessageSigned }: MessageSignerProps) {
  const [message, setMessage] = useState("");
  const [isSigningLoading, setIsSigningLoading] = useState(false);
  const { user, primaryWallet } = useDynamicContext();

  const { toast } = useToast();

  const handleSignMessage = async () => {
    if (!message.trim()) {
      toast({
        title: "Message required",
        description: "Please enter a message to sign",
        variant: "destructive",
      });
      return;
    }

    const address = user?.verifiedCredentials[0]?.address;

    if (!user || !primaryWallet || !address) {
      toast({
        title: "User not connected",
        description: "Please login as a user first",
        variant: "destructive",
      });
      return;
    }


    try {
      setIsSigningLoading(true);
      const signature = await primaryWallet.signMessage(message);

      console.log("signature ",signature);
      
      onMessageSigned(message, signature || '', address);

      setMessage("");

      toast({
        title: "Message signed",
        description: "Message signed successfully",
      });
    } catch (error) {
      console.error("Signing failed:", error);
      toast({
        title: "Signing failed",
        description:
          error instanceof Error ? error.message : "Failed to sign message",
        variant: "destructive",
      });
    } finally {
      setIsSigningLoading(false);
    }
  };

  const clearMessage = () => {
    setMessage("");
  };

  const messageLength = message.length;
  const maxLength = 1000;

  return (
    <div className="gradient-border">
      <div className="gradient-border-inner p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Pen className="text-primary-foreground" size={16} />
          </div>
          <h3 className="text-xl font-semibold">Sign New Message</h3>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Message to Sign
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-4 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent resize-none transition-all min-h-[120px]"
              placeholder="Enter your message here..."
              maxLength={maxLength}
              data-testid="input-message"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Plain text message</span>
              <span data-testid="text-character-count">
                {messageLength}/{maxLength} characters
              </span>
            </div>
          </div>

          <div className="flex space-x-4">
            <Button
              onClick={handleSignMessage}
              disabled={isSigningLoading || !user || !message.trim()}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-6"
              data-testid="button-sign-message"
            >
              {isSigningLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Signing...</span>
                </>
              ) : (
                <>
                  <Signature className="mr-2 h-4 w-4" />
                  <span>Sign Message</span>
                </>
              )}
            </Button>
            <Button
              onClick={clearMessage}
              variant="secondary"
              className="bg-muted hover:bg-muted/80 text-muted-foreground font-medium py-3 px-6"
              disabled={isSigningLoading}
              data-testid="button-clear-message"
            >
              Clear
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
