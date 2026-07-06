const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS_CAP = 4000;
const MAX_TOKENS_DEFAULT = 1500;
const MAX_BODY_BYTES = 6 * 1024 * 1024; // 6 MB
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

const ALLOWED_WEB_SEARCH_TOOL = [{ type: 'web_search_20250305', name: 'web_search' }];

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'Method not allowed. Use POST.' });
  }

  const rawBody = event.body || '';
  const bodyBytes = Buffer.byteLength(rawBody, event.isBase64Encoded ? 'base64' : 'utf8');
  if (bodyBytes > MAX_BODY_BYTES) {
    return respond(413, { error: 'Request body too large (max 6 MB).' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return respond(500, { error: 'ANTHROPIC_API_KEY not set in Netlify environment variables' });
  }

  let clientBody;
  try {
    clientBody = JSON.parse(event.isBase64Encoded ? Buffer.from(rawBody, 'base64').toString('utf8') : rawBody);
  } catch (err) {
    return respond(400, { error: 'Request body must be valid JSON.' });
  }

  const upstreamBody = {
    model: MODEL,
    max_tokens: clampMaxTokens(clientBody.max_tokens),
    messages: clientBody.messages || [],
  };

  if (clientBody.system) {
    upstreamBody.system = clientBody.system;
  }

  if (Array.isArray(clientBody.tools) && clientBody.tools.length > 0) {
    upstreamBody.tools = ALLOWED_WEB_SEARCH_TOOL;
  }

  try {
    const upstreamRes = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify(upstreamBody),
    });

    const data = await upstreamRes.json();
    return respond(upstreamRes.status, data);
  } catch (err) {
    return respond(502, { error: err.message || 'Failed to reach Anthropic API' });
  }
};

function clampMaxTokens(value) {
  const n = Number.isFinite(value) ? Math.floor(value) : MAX_TOKENS_DEFAULT;
  if (n <= 0) return MAX_TOKENS_DEFAULT;
  return Math.min(n, MAX_TOKENS_CAP);
}

function respond(statusCode, bodyObj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyObj),
  };
}
