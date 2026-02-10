// deno-lint-ignore-file no-explicit-any
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resolveString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const DEFAULT_GLAM_PROMPT = [
  'This is an image edit task, not image generation from scratch.',
  'Glamify the exact uploaded image and preserve the same subject and composition.',
  'Do not replace the person, do not change identity, and do not create a new person.',
  'If the input has no person, keep the original scene and do not add any people.',
  'Preserve facial features, skin tone, hair, pose, background structure, and framing.',
  'Apply only tasteful glam enhancements: flattering lighting, refined color, and gentle polish.',
].join(' ');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
  if (!openaiKey) {
    return new Response(JSON.stringify({ error: 'OpenAI API key not configured.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const glamPrompt = resolveString(Deno.env.get('AVATAR_GLAM_PROMPT')) || DEFAULT_GLAM_PROMPT;
  const size = resolveString(payload?.size) || '1024x1024';
  const model = Deno.env.get('OPENAI_IMAGE_MODEL') ?? 'gpt-image-1.5';
  const imageUrl = resolveString(payload?.imageUrl ?? payload?.image_url);
  const imageBase64 = resolveString(payload?.imageBase64 ?? payload?.image_base64);

  const promptParts = [glamPrompt];
  const finalPrompt = promptParts.join('\n');

  if (!imageUrl && !imageBase64) {
    return new Response(JSON.stringify({ error: 'Source image is required for edits.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let imageBytes: Uint8Array | null = null;
  let imageType = 'image/png';
  if (imageBase64) {
    const match = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
    const cleaned = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
    imageBytes = Uint8Array.from(atob(cleaned), (char) => char.charCodeAt(0));
    if (match?.[1]) {
      imageType = match[1];
    }
  } else if (imageUrl) {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch source image.', detail: imageResponse.status }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
    const buffer = await imageResponse.arrayBuffer();
    imageBytes = new Uint8Array(buffer);
    imageType = imageResponse.headers.get('content-type') ?? imageType;
  }

  if (!imageBytes || imageBytes.byteLength === 0) {
    return new Response(JSON.stringify({ error: 'Source image is empty.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const formData = new FormData();
  formData.append('model', model);
  formData.append('prompt', finalPrompt);
  formData.append('size', size);
  formData.append('output_format', 'png');
  formData.append('quality', 'high');
  if (model === 'gpt-image-1') {
    formData.append('input_fidelity', 'high');
  }
  formData.append(
    'image',
    new File([imageBytes], 'avatar.png', {
      type: imageType,
    }),
  );

  let response: Response | null = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
      },
      body: formData,
    });
    if (response.ok) {
      break;
    }
    if (response.status < 500 || attempt === 2) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (!response || !response.ok) {
    const status = response?.status ?? 500;
    let detail = '';
    if (response) {
      try {
        const errorJson = await response.json();
        detail =
          errorJson?.error?.message ||
          errorJson?.error?.type ||
          JSON.stringify(errorJson);
      } catch {
        detail = await response.text();
      }
    }
    console.error('[avatar-generator] OpenAI error', status, detail);
    return new Response(
      JSON.stringify({
        error: 'Image generation failed.',
        detail,
        status,
      }),
      {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  const data = await response.json();
  const b64 = data?.data?.[0]?.b64_json ?? null;
  const revisedPrompt = data?.data?.[0]?.revised_prompt ?? null;

  if (!b64) {
    return new Response(JSON.stringify({ error: 'No image data returned.' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ b64, revisedPrompt, model, size }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
