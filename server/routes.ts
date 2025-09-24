import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { verifySignatureSchema, insertSignedMessageSchema } from "@shared/schema";
import type { VerifySignatureResponse } from "@shared/schema";
import { ethers } from "ethers";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/verify-signature", async (req, res) => {
    try {
      const { message, signature } = verifySignatureSchema.parse(req.body);

      let isValid = false;
      let signer: string | null = null;

      try {
        signer = ethers.verifyMessage(message, signature);
        isValid = true;
      } catch (error) {
        console.error("Signature verification failed:", error);
        isValid = false;
        signer = null;
      }

      if (isValid && signer) {
        try {
          await storage.createSignedMessage({
            message,
            signature,
            signerAddress: signer,
          });
        } catch (error) {
          console.error("Failed to store signed message:", error);
        }
      }

      const response: VerifySignatureResponse = {
        isValid,
        signer,
        originalMessage: message,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      console.error("Verification endpoint error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: error.errors,
        });
      }

      res.status(500).json({
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.get("/api/messages", async (req, res) => {
    try {
      const messages = await storage.getAllSignedMessages();
      res.json(messages);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      res.status(500).json({
        message: "Failed to fetch messages",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.get("/api/messages/address/:address", async (req, res) => {
    try {
      const { address } = req.params;
      
      if (!address || !ethers.isAddress(address)) {
        return res.status(400).json({
          message: "Invalid Ethereum address",
        });
      }

      const messages = await storage.getSignedMessagesByAddress(address);
      res.json(messages);
    } catch (error) {
      console.error("Failed to fetch messages by address:", error);
      res.status(500).json({
        message: "Failed to fetch messages",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.delete("/api/messages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          message: "Message ID is required",
        });
      }

      const deleted = await storage.deleteSignedMessage(id);
      
      if (!deleted) {
        return res.status(404).json({
          message: "Message not found",
        });
      }

      res.json({
        message: "Message deleted successfully",
        id,
      });
    } catch (error) {
      console.error("Failed to delete message:", error);
      res.status(500).json({
        message: "Failed to delete message",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.delete("/api/messages/address/:address", async (req, res) => {
    try {
      const { address } = req.params;
      
      if (!address || !ethers.isAddress(address)) {
        return res.status(400).json({
          message: "Invalid Ethereum address",
        });
      }

      const deletedCount = await storage.deleteSignedMessagesByAddress(address);
      
      res.json({
        message: `${deletedCount} messages deleted successfully`,
        address,
        deletedCount,
      });
    } catch (error) {
      console.error("Failed to delete messages by address:", error);
      res.status(500).json({
        message: "Failed to delete messages",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.delete("/api/messages", async (req, res) => {
    try {
      await storage.deleteAllSignedMessages();
      
      res.json({
        message: "All messages deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete all messages:", error);
      res.status(500).json({
        message: "Failed to delete all messages",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
