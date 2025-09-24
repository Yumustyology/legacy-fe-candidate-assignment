import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import type { SignedMessage } from "@shared/schema";


export type { SignedMessage as StoredMessage } from "@shared/schema";

export function useMessageHistory() {
  const queryClient = useQueryClient();
  const { user } = useDynamicContext();
  
  const userAddress = user?.verifiedCredentials?.[0]?.address;

  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ['messages', userAddress],
    queryFn: async (): Promise<SignedMessage[]> => {
      if (!userAddress) {
        return [];
      }
      
      const response = await fetch(`/api/messages/address/${userAddress}`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      const data = await response.json();
      
      return data.map((message: any) => ({
        ...message,
        timestamp: message.timestamp instanceof Date 
          ? message.timestamp.toISOString() 
          : new Date(message.timestamp).toISOString()
      }));
    },
    enabled: !!userAddress,
    staleTime: 0, 
    refetchOnWindowFocus: true,
  });

  const addMessage = async (message: Omit<SignedMessage, 'id' | 'timestamp'>) => {
    if (!userAddress) return;
    
    queryClient.setQueryData(['messages', userAddress], (old: SignedMessage[] | undefined) => {
      const newMessage: SignedMessage = {
        ...message,
        id: `temp-${Date.now()}`,
        timestamp: new Date(),
      };
      return [newMessage, ...(old || [])];
    });

    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['messages', userAddress] });
    }, 1000);
  };

  const clearHistory = async () => {
    if (!userAddress) return;
    
    try {
      const response = await fetch(`/api/messages/address/${userAddress}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear messages');
      }
      
      queryClient.invalidateQueries({ queryKey: ['messages', userAddress] });
    } catch (error) {
      console.error('Failed to clear history:', error);
      throw error;
    }
  };

  const removeMessage = async (id: string) => {
    if (!userAddress) return;
    
    try {
      const response = await fetch(`/api/messages/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete message');
      }
      
      queryClient.setQueryData(['messages', userAddress], (old: SignedMessage[] | undefined) => {
        return old ? old.filter(msg => msg.id !== id) : [];
      });

      queryClient.invalidateQueries({ queryKey: ['messages', userAddress] });
    } catch (error) {
      console.error('Failed to remove message:', error);
      queryClient.invalidateQueries({ queryKey: ['messages', userAddress] });
      throw error;
    }
  };

  const refreshMessages = () => {
    if (!userAddress) return;
    queryClient.invalidateQueries({ queryKey: ['messages', userAddress] });
  };

  return {
    messages,
    isLoading,
    error,
    addMessage,
    clearHistory,
    removeMessage,
    refreshMessages,
  };
}
