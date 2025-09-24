import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Trash2, Eye, Calendar } from "lucide-react";
import { useMessageHistory, type StoredMessage } from "@/hooks/use-message-history";
import { EthersService } from "@/lib/ethers";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export function MessageHistory() {
  const { messages, isLoading, error, clearHistory, removeMessage } = useMessageHistory();
  const { toast } = useToast();
  const [selectedMessage, setSelectedMessage] = useState<StoredMessage | null>(null);

  const handleClearHistory = async () => {
    try {
      await clearHistory();
      toast({
        title: "History cleared",
        description: "All message history has been cleared",
      });
    } catch (error) {
      toast({
        title: "Failed to clear history",
        description: "Unable to clear message history",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      await removeMessage(id);
      toast({
        title: "Message deleted",
        description: "Message has been removed from history",
      });
    } catch (error) {
      toast({
        title: "Failed to delete message",
        description: "Unable to delete the message",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card border border-border">
        <CardContent className="p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <History className="text-accent-foreground" size={16} />
            </div>
            <h3 className="text-xl font-semibold">Message History</h3>
          </div>
          
          <div className="text-center py-8">
            <div className="animate-spin mx-auto h-8 w-8 border-2 border-primary border-t-transparent rounded-full mb-4"></div>
            <p className="text-muted-foreground">Loading message history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-card border border-border">
        <CardContent className="p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <History className="text-accent-foreground" size={16} />
            </div>
            <h3 className="text-xl font-semibold">Message History</h3>
          </div>
          
          <div className="text-center py-8">
            <div className="mx-auto h-12 w-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <span className="text-destructive text-xl">⚠</span>
            </div>
            <h4 className="text-lg font-medium mb-2">Failed to load messages</h4>
            <p className="text-muted-foreground">Unable to fetch message history from server</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTimeAgo = (timestamp: string | Date) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - messageTime.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const truncateMessage = (message: string, maxLength: number = 60) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + "...";
  };

  if (messages.length === 0) {
    return (
      <Card className="bg-card border border-border">
        <CardContent className="p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <History className="text-accent-foreground" size={16} />
            </div>
            <h3 className="text-xl font-semibold">Message History</h3>
          </div>
          
          <div className="text-center py-8">
            <History className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium mb-2">No messages signed yet</h4>
            <p className="text-muted-foreground">Your personal signed messages will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border border-border">
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <History className="text-accent-foreground" size={16} />
            </div>
            <h3 className="text-xl font-semibold">My Signed Messages</h3>
          </div>
          <Button
            onClick={handleClearHistory}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-clear-history"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            <span>Clear All</span>
          </Button>
        </div>

        <div className="space-y-4" data-testid="message-history-list">
          {messages.reverse().map((message, index) => (
            <div
              key={message.id}
              className="bg-muted/50 rounded-lg p-4 border border-border/50 hover:bg-muted/70 transition-colors"
              data-testid={`message-history-item-${message.id}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Message #{messages.length - index}</span>
                  <Badge
                    variant={message.isVerified ? "default" : "destructive"}
                    className={message.isVerified ? "bg-success/20 text-success border-success/20" : ""}
                  >
                    {message.isVerified ? "Verified" : "Failed"}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span data-testid={`text-message-time-${message.id}`}>
                    {formatTimeAgo(message.timestamp)}
                  </span>
                </div>
              </div>
              
              <div className="mb-3">
                <p className="text-sm text-muted-foreground" data-testid={`text-message-content-${message.id}`}>
                  {truncateMessage(message.message)}
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  <span>Signature: {message.signature.slice(0, 20)}...</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">
                    {EthersService.formatAddress(message.signerAddress)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedMessage(message)}
                    className="text-xs text-primary hover:text-primary/80 h-6 px-2"
                    data-testid={`button-view-details-${message.id}`}
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    View Details
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteMessage(message.id)}
                    className="text-xs text-destructive hover:text-destructive/80 h-6 px-2"
                    data-testid={`button-delete-message-${message.id}`}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {messages.length >= 10 && (
          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
              Showing {messages.length} messages • Automatically stores last 100 messages
            </p>
          </div>
        )}
      </CardContent>
 
      {selectedMessage && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full border border-white max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Message Details</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMessage(null)}
                  data-testid="button-close-details"
                >
                  ✕
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Message</label>
                  <div className="bg-muted rounded p-3">
                    <p className="text-sm">{selectedMessage.message}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Signature</label>
                  <div className="bg-muted rounded p-3">
                    <p className="signature-text text-xs text-muted-foreground">{selectedMessage.signature}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Signer</label>
                    <p className="text-sm wallet-address">{selectedMessage.signerAddress}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Timestamp</label>
                    <p className="text-sm">{new Date(selectedMessage.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
}
