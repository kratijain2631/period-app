import { supabase, isSupabaseConfigured } from './client';

export type AvatarGenerationResult = {
  b64: string;
  revisedPrompt?: string | null;
  model?: string | null;
  size?: string | null;
};

export type AvatarGenerationInput = {
  prompt: string;
  imageBase64?: string;
  imageUrl?: string;
};

const parseErrorPayload = (payload: unknown): string | null => {
  if (!payload) {
    return null;
  }
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload) as { error?: string; detail?: string; message?: string };
      return parsed?.detail ?? parsed?.error ?? parsed?.message ?? payload;
    } catch {
      return payload;
    }
  }
  if (typeof payload === 'object') {
    const parsed = payload as { error?: string; detail?: string; message?: string };
    return parsed?.detail ?? parsed?.error ?? parsed?.message ?? null;
  }
  return null;
};

const extractFunctionErrorMessage = async (error: unknown): Promise<string | null> => {
  const err = error as {
    context?: unknown;
  };
  const context = err?.context as
    | { body?: unknown; json?: () => Promise<unknown>; text?: () => Promise<string> }
    | undefined;

  const fromBody = parseErrorPayload(context?.body);
  if (fromBody) {
    return fromBody;
  }

  if (context?.json) {
    try {
      const jsonPayload = await context.json();
      const fromJson = parseErrorPayload(jsonPayload);
      if (fromJson) {
        return fromJson;
      }
    } catch {
      // no-op
    }
  }

  if (context?.text) {
    try {
      const textPayload = await context.text();
      const fromText = parseErrorPayload(textPayload);
      if (fromText) {
        return fromText;
      }
    } catch {
      // no-op
    }
  }

  return null;
};

export const generateAvatarImage = async (
  input: AvatarGenerationInput,
): Promise<AvatarGenerationResult> => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  const maxAttempts = 2;
  let lastErrorMessage: string | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const { data, error } = await supabase.functions.invoke('avatar-generator', {
      body: input,
    });

    if (!error) {
      return data as AvatarGenerationResult;
    }

    const parsedMessage = await extractFunctionErrorMessage(error);
    const err = error as { message?: string };
    lastErrorMessage = parsedMessage ?? err?.message ?? 'Unable to generate avatar right now.';

    const shouldRetry =
      attempt < maxAttempts &&
      (lastErrorMessage.includes('non-2xx') ||
        lastErrorMessage.includes('Image generation failed') ||
        lastErrorMessage.includes('Failed to send a request'));

    if (shouldRetry) {
      await new Promise((resolve) => setTimeout(resolve, 450));
      continue;
    }

    throw new Error(lastErrorMessage);
  }

  throw new Error(lastErrorMessage ?? 'Unable to generate avatar right now.');
};

export const uploadAvatarBlob = async (
  userId: string,
  body: Blob | ArrayBuffer | Uint8Array,
  extension = 'jpg',
  contentType?: string,
): Promise<string> => {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  const safeExtension = extension.replace('.', '') || 'jpg';
  const inferredContentType =
    contentType ||
    (typeof (body as Blob).type === 'string' && (body as Blob).type) ||
    (safeExtension === 'jpg' ? 'image/jpeg' : `image/${safeExtension}`);
  const filePath = `${userId}/avatar-${Date.now()}.${safeExtension}`;
  const { error } = await supabase.storage
    .from('profile-avatars')
    .upload(filePath, body, { contentType: inferredContentType, upsert: true });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from('profile-avatars').getPublicUrl(filePath);
  if (!data?.publicUrl) {
    throw new Error('Unable to resolve avatar URL.');
  }

  return data.publicUrl;
};
