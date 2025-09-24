import { ethers } from "ethers";

export class EthersService {
  static verifyMessage(message: string, signature: string): string {
    try {
      return ethers.verifyMessage(message, signature);
    } catch (error) {
      throw new Error("Invalid signature or message");
    }
  }

  static isAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  static formatAddress(address: string): string {
    if (!this.isAddress(address)) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  static async getCurrentNetwork(): Promise<string> {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        return network.name;
      }
      return "Unknown";
    } catch (error) {
      console.error("Failed to get network:", error);
      return "Unknown";
    }
  }
}

export { ethers };
