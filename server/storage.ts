import { type SignedMessage, type InsertSignedMessage } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getSignedMessage(id: string): Promise<SignedMessage | undefined>;
  getSignedMessagesByAddress(address: string): Promise<SignedMessage[]>;
  createSignedMessage(message: InsertSignedMessage): Promise<SignedMessage>;
  getAllSignedMessages(): Promise<SignedMessage[]>;
  deleteSignedMessage(id: string): Promise<boolean>;
  deleteSignedMessagesByAddress(address: string): Promise<number>;
  deleteAllSignedMessages(): Promise<void>;
}

export class MemStorage implements IStorage {
  private signedMessages: Map<string, SignedMessage>;

  constructor() {
    this.signedMessages = new Map();
  }

  async getSignedMessage(id: string): Promise<SignedMessage | undefined> {
    return this.signedMessages.get(id);
  }

  async getSignedMessagesByAddress(address: string): Promise<SignedMessage[]> {
    return Array.from(this.signedMessages.values()).filter(
      (message) => message.signerAddress.toLowerCase() === address.toLowerCase()
    );
  }

  async createSignedMessage(insertMessage: InsertSignedMessage): Promise<SignedMessage> {
    const existingMessage = Array.from(this.signedMessages.values()).find(
      (message) => message.signature === insertMessage.signature
    );
    
    if (existingMessage) {
      return existingMessage;
    }

    const id = randomUUID();
    const signedMessage: SignedMessage = {
      ...insertMessage,
      id,
      timestamp: new Date(),
      isVerified: true,
    };
    this.signedMessages.set(id, signedMessage);
    return signedMessage;
  }

  async getAllSignedMessages(): Promise<SignedMessage[]> {
    return Array.from(this.signedMessages.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  async deleteSignedMessage(id: string): Promise<boolean> {
    return this.signedMessages.delete(id);
  }

  async deleteSignedMessagesByAddress(address: string): Promise<number> {
    const messagesToDelete = Array.from(this.signedMessages.entries()).filter(
      ([, message]) => message.signerAddress.toLowerCase() === address.toLowerCase()
    );
    
    messagesToDelete.forEach(([id]) => {
      this.signedMessages.delete(id);
    });
    
    return messagesToDelete.length;
  }

  async deleteAllSignedMessages(): Promise<void> {
    this.signedMessages.clear();
  }
}

export const storage = new MemStorage();
