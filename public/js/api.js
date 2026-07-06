// Client-side helper for talking to the Claude proxy function.

export async function claudeCall({ messages, system, tools, max_tokens }) {
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, system, tools, max_tokens }),
  });

  let data;
  try {
    data = await res.json();
  } catch (err) {
    throw new Error(`API error ${res.status}: could not parse response`);
  }

  if (!res.ok) {
    throw new Error(data.error?.message || data.error || `API error ${res.status}`);
  }

  return (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

// Strips ``` fences and extracts the first {...} block, then JSON.parse's it.
// Every tool that asks Claude for JSON should route the raw text through this.
export function parseJsonLoose(text) {
  if (!text) throw new Error('Empty response');
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('No JSON object found in response');
  }
  const jsonSlice = cleaned.slice(start, end + 1);
  return JSON.parse(jsonSlice);
}

// Builds an image content block for a vision message from a data URL.
export function imageBlockFromDataUrl(dataUrl) {
  const match = /^data:(image\/[a-zA-Z]+);base64,(.*)$/.exec(dataUrl);
  if (!match) throw new Error('Not a valid image data URL');
  return {
    type: 'image',
    source: { type: 'base64', media_type: match[1], data: match[2] },
  };
}
