import fs from "node:fs";
import * as fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

const AUDIO_KIND = "audio.transcription";
const DEFAULT_VOICE_MIME = "audio/webm";
const DEFAULT_VOICE_BASENAME = "voice-note";

const MIME_EXTENSION_MAP: Record<string, string> = {
  "audio/mp4": ".m4a",
  "audio/mpeg": ".mp3",
  "audio/ogg": ".ogg",
  "audio/wav": ".wav",
  "audio/webm": ".webm",
  "audio/x-m4a": ".m4a",
  "audio/x-wav": ".wav",
};

type MediaUnderstandingDecision = {
  outcome?: string;
  attachments?: Array<{
    attempts?: Array<{
      reason?: string;
    }>;
  }>;
};

export type OpenClawVoiceTranscriptionResult = {
  transcript: string | null;
  provider: string | null;
  model: string | null;
  decision: MediaUnderstandingDecision | null;
  ignored: boolean;
};

export const normalizeVoiceMimeType = (value: string | null | undefined): string => {
  const trimmed = value?.trim().toLowerCase() ?? "";
  if (!trimmed) return DEFAULT_VOICE_MIME;
  const [baseType] = trimmed.split(";", 1);
  return MIME_EXTENSION_MAP[baseType] ? baseType : trimmed.startsWith("audio/") ? baseType : DEFAULT_VOICE_MIME;
};

export const inferVoiceFileExtension = (
  extension: string | null | undefined,
  mimeType: string | null | undefined,
): string => {
  if (extension) return extension;
  return normalizeVoiceMimeType(mimeType).replace("audio/", ".");
};

// Stub implementation for Vercel - openclaw is not available
export const isOpenClawInstalled = (): boolean => {
  return false;
};

export const loadOpenClawTranscriptionSdk = async () => {
  return null;
};

export const transcribeVoiceAudio = async (
  audioData: Buffer,
  mimeType: string | null,
  _openClawApiKey?: string,
): Promise<OpenClawVoiceTranscriptionResult> => {
  // Always return ignored on Vercel since openclaw is not available
  return { transcript: null, provider: null, model: null, decision: null, ignored: true };
};

// Wrapper for route handler
export const transcribeVoiceWithOpenClaw = async ({
  buffer,
  fileName,
  mimeType,
}: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}): Promise<OpenClawVoiceTranscriptionResult> => {
  return transcribeVoiceAudio(buffer, mimeType);
};
