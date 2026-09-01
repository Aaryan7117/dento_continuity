import { z } from "zod";

export const FindingTypeSchema = z.enum([
  "CARIES",
  "RESTORATION",
  "CROWN",
  "MISSING",
  "IMPLANT",
  "ENDODONTIC",
  "FRACTURE",
  "SEALANT",
  "WEAR",
  "EXTRACTION_INDICATED",
]);

export const ToothSurfaceSchema = z.enum([
  "MESIAL",
  "DISTAL",
  "OCCLUSAL",
  "BUCCAL",
  "LINGUAL",
]);

export const AppointmentStatusSchema = z.enum([
  "SCHEDULED",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]);

export const MessageChannelSchema = z.enum([
  "SMS",
  "WHATSAPP",
  "EMAIL",
]);

export type FindingType = z.infer<typeof FindingTypeSchema>;
export type ToothSurface = z.infer<typeof ToothSurfaceSchema>;
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;
export type MessageChannel = z.infer<typeof MessageChannelSchema>;
