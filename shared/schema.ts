import { z } from "zod";

export type SignedMessage = {
  id: string;
  message: string;
  signature: string;
  signerAddress: string;
  timestamp: Date;
  isVerified: boolean;
};

export type InsertSignedMessage = {
  message: string;
  signature: string;
  signerAddress: string;
};

export const insertSignedMessageSchema = z.object({
  message: z.string(),
  signature: z.string(),
  signerAddress: z.string(),
});

export const verifySignatureSchema = z.object({
  message: z.string().min(1, "Message is required").max(1000, "Message too long"),
  signature: z.string().min(1, "Signature is required"),
});

export type VerifySignatureRequest = z.infer<typeof verifySignatureSchema>;

export type VerifySignatureResponse = {
  isValid: boolean;
  signer: string | null;
  originalMessage: string;
  timestamp: string;
};
