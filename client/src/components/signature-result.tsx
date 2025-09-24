import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Copy, Save, Download, Share, Shield, Clock, X } from "lucide-react";
import { EthersService } from "@/lib/ethers";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { VerifySignatureResponse } from "@shared/schema";
import { useMessageHistory } from "@/hooks/use-message-history";

interface SignatureResultProps {
  message: string;
  signature: string;
  signerAddress: string;
  onClose?: () => void;
}

export function SignatureResult({ message, signature, signerAddress, onClose }: SignatureResultProps) {
  const { toast } = useToast();
  const { refreshMessages } = useMessageHistory();

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/verify-signature", {
        message,
        signature,
      });
      return await response.json() as VerifySignatureResponse;
    },
    onSuccess: (data) => {
      if (data.isValid) {
        
        refreshMessages();
      }
    },
    onError: (error) => {
      console.error("Verification failed:", error);
      toast({
        title: "Verification failed",
        description: "Failed to verify signature with backend",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    verifyMutation.mutate();
  }, []);

  const copySignature = async () => {
    try {
      await navigator.clipboard.writeText(signature);
      toast({
        title: "Signature copied",
        description: "Signature copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy signature to clipboard",
        variant: "destructive",
      });
    }
  };

  const downloadSignature = () => {
    const data = {
      message,
      signature,
      signerAddress,
      timestamp: new Date().toISOString(),
      verified: verifyMutation.data?.isValid || false,
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `signature-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Signature downloaded",
      description: "Signature data downloaded as JSON file",
    });
  };

  const shareSignature = async () => {
    const shareData = {
      title: "Web3 Message Signature",
      text: `Message: ${message}\nSignature: ${signature.slice(0, 20)}...`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(
          `Message: ${message}\nSignature: ${signature}\nSigner: ${signerAddress}`
        );
        toast({
          title: "Signature shared",
          description: "Signature details copied to clipboard",
        });
      }
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  const verificationData = verifyMutation.data;
  const isVerifying = verifyMutation.isPending;
  const verificationError = verifyMutation.error;

  return (
    <Card className="bg-card border border-border">
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-6  relative">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              <CheckCircle className="" size={16} />
            </div>
            <h3 className="text-xl font-semibold">Signature Generated</h3>
          </div>
          <div className="flex items-center pt-1 space-x-3">
            <Badge
              variant={verificationData?.isValid ? "default" : "destructive"}
              className={verificationData?.isValid ? "bg-green-400/20 text-green-400 border-green-500/20" : ""}
              data-testid="badge-verification-status"
            >
              {isVerifying ? "Verifying..." : verificationData?.isValid ? "Verified ✓" : verificationError ? "Verification Failed" : "Pending"}
            </Badge>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-muted absolute -top-10 -right-10 bg-red-400 hover:border-white hover:border"
                data-testid="button-close-signature-result"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Original Message</label>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm" data-testid="text-original-message">{message}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Digital Signature</label>
            <div className="bg-muted rounded-lg p-4 relative">
              <p className="signature-text text-muted-foreground pr-10" data-testid="text-signature">
                {signature}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={copySignature}
                className="absolute top-2 right-2 h-8 w-8 p-0"
                data-testid="button-copy-signature"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Backend Verification</label>
            <div
              className={`rounded-lg p-4 border ${
                verificationData?.isValid
                  ? "bg-green-400/10 border-green-400/20"
                  : verificationError
                  ? "bg-red-400/10 border-red-400/20"
                  : "bg-muted/10 border-border"
              }`}
            >
              {isVerifying ? (
                <div className="flex items-center space-x-2">
                  <Shield className="text-muted-foreground animate-pulse" size={16} />
                  <span className="font-medium text-muted-foreground">Verifying signature...</span>
                </div>
              ) : verificationData?.isValid ? (
                <>
                  <div className="flex items-center space-x-2 mb-2">
                    <Shield className="text-green-400" size={16} />
                    <span className="font-medium text-success-foreground">Signature Valid</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Signer Address:</span>
                      <span className="wallet-address" data-testid="text-signer-address">
                        {EthersService.formatAddress(verificationData.signer || "")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Verification Time:</span>
                      <span data-testid="text-verification-time">
                        {new Date(verificationData.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-2">
                  <Shield className="text-red-400" size={16} />
                  <span className="font-medium text-red-400">
                    {verificationError ? "Verification failed" : "Invalid signature"}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-4 border-t border-border">
            <Button
              onClick={downloadSignature}
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium"
              data-testid="button-download-signature"
            >
              <Download className="mr-2 h-4 w-4" />
              <span>Download</span>
            </Button>
            <Button
              onClick={shareSignature}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              data-testid="button-share-signature"
            >
              <Share className="mr-2 h-4 w-4" />
              <span>Share</span>
            </Button>
            <Button
              variant="outline"
              onClick={copySignature}
              className="font-medium"
              data-testid="button-copy-signature-action"
            >
              <Copy className="mr-2 h-4 w-4" />
              <span>Copy</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
