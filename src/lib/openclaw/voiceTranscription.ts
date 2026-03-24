import fs from "node:fs";
import * as fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

const CONFIGURED_OPENCLAW_PACKAGE_ROOT = process.env.OPENCLAW_PACKAGE_ROOT?.trim() ?? "";

const OPENCLAW_DIST_INDEX_RELATIVE_PATH = path.join("dist", "index.js");
const OPENCLAW_DIST_DIRECTORY_RELATIVE_PATH = "dist";
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

type OpenClawConfig = {
  tools?: {
    media?: {
      audio?: {
        enabled?: boolean;
      };
    };
  };
};

type MediaUnderstandingOutput = {
  kind?: string;
  text?: string;
  provider?: string;
  model?: string;
};

type MediaUnderstandingDecision = {
  outcome?: string;
  attachments?: Array<{
    attempts?: Array<{
      reason?: string;
    }>;
  }>;
};

type RunCapabilityResult = {
  outputs?: MediaUnderstandingOutput[];
  decision?: MediaUnderstandingDecision;
};

type OpenClawConfigModule = {
  t: () => OpenClawConfig;
};

type OpenClawRunnerModule = {
  a: (params: {
    capability: "audio";
    cfg: OpenClawConfig;
    ctx: Record<string, unknown>;
    attachments: {
      cleanup: () => Promise<void>;
    };
    media: Array<Record<string, unknown>>;
    providerRegistry: unknown;
    config: unknown;
  }) => Promise<RunCapabilityResult>;
  n: (attachments: Array<Record<string, unknown>>) => {
    cleanup: () => Promise<void>;
  };
  r: (ctx: Record<string, unknown>) => Array<Record<string, unknown>>;
  t: () => unknown;
};

type OpenClawTranscriptionSdk = {
  loadConfig: OpenClawConfigModule["t"];
  runCapability: OpenClawRunnerModule["a"];
  createMediaAttachmentCache: OpenClawRunnerModule["n"];
  normalizeMediaAttachments: OpenClawRunnerModule["r"];
  buildProviderRegistry: OpenClawRunnerModule["t"];
};

export type OpenClawVoiceTranscriptionResult = {
  transcript: string | null;
  provider: string | null;
  model: string | null;
  decision: MediaUnderstandingDecision | null;
  ignored: boolean;
};

let sdkPromise: Promise<OpenClawTranscriptionSdk | null> | null = null;

const resolveInstalledOpenClawPackageRoot = (): string | null => {
  // openclaw is not available in Vercel - return null
  return null;
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

export const isOpenClawInstalled = (): boolean => {
  return resolveInstalledOpenClawPackageRoot() !== null;
};

export const loadOpenClawTranscriptionSdk = async (
  packageRoot?: string,
): Promise<OpenClawTranscriptionSdk | null> => {
  if (sdkPromise) return sdkPromise;
  sdkPromise = (async () => {
    try {
      const resolvedRoot =
        packageRoot?.trim() || CONFIGURED_OPENCLAW_PACKAGE_ROOT || resolveInstalledOpenClawPackageRoot();
      if (!resolvedRoot) {
        console.warn("[voiceTranscription] openclaw package not found");
        return null;
      }
      const entryUrl = pathToFileURL(path.join(resolvedRoot, OPENCLAW_DIST_INDEX_RELATIVE_PATH));
      const sdk = (await import(/* @vite-ignore */ entryUrl.href)) as {
        default: OpenClawTranscriptionSdk;
      };
      return sdk.default ?? null;
    } catch (err) {
      console.error("[voiceTranscription] Failed to load openclaw transcription SDK:", err);
      return null;
    }
  })();
  return sdkPromise;
};

export const transcribeVoiceAudio = async (
  audioData: Buffer,
  mimeType: string | null,
  openClawApiKey?: string,
): Promise<OpenClawVoiceTranscriptionResult> => {
  if (!audioData.length) {
    return { transcript: null, provider: null, model: null, decision: null, ignored: false };
  }

  const sdk = await loadOpenClawTranscriptionSdk();
  if (!sdk) {
    return { transcript: null, provider: null, model: null, decision: null, ignored: true };
  }

  const tmpDir = os.tmpdir();
  const extension = inferVoiceFileExtension(null, mimeType);
  const basename = `${DEFAULT_VOICE_BASENAME}-${randomUUID()}${extension}`;
  const tmpPath = path.join(tmpDir, basename);

  try {
    await fsp.writeFile(tmpPath, audioData);

    const config: OpenClawConfig = {
      tools: {
        media: {
          audio: {
            enabled: true,
          },
        },
      },
    };

    const sdkConfig = sdk.loadConfig?.() ?? (() => config);
    const effectiveConfig = typeof sdkConfig === "function" ? sdkConfig() : config;

    const providerRegistry = sdk.buildProviderRegistry?.() ?? {};
    const ctx = openClawApiKey ? { OPENCLAW_API_KEY: openClawApiKey } : {};

    const attachments = sdk.normalizeMediaAttachments?.(ctx) ?? [];
    const mediaAttachmentCache = sdk.createMediaAttachmentCache?.(attachments) ?? {
      cleanup: async () => {},
    };

    const result = await sdk.runCapability({
      capability: "audio",
      cfg: effectiveConfig,
      ctx,
      attachments: mediaAttachmentCache,
      media: [{ url: pathToFileURL(tmpPath).href, mimeType: mimeType ?? DEFAULT_VOICE_MIME }],
      providerRegistry,
      config: {},
    });

    const output = result.outputs?.[0];
    return {
      transcript: output?.text ?? null,
      provider: output?.provider ?? null,
      model: output?.model ?? null,
      decision: result.decision ?? null,
      ignored: false,
    };
  } finally {
    await fsp.unlink(tmpPath).catch(() => {});
    await mediaAttachmentCache?.cleanup?.();
  }
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
