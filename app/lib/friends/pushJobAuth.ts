// Only this repository's main-branch job may drain the queue. No shared secret.
// Trust metadata: https://docs.github.com/en/actions/reference/security/oidc
export const PUSH_JOB_AUDIENCE = 'https://musclepas-api.y0u2t1a8.chatgpt.site/api/internal/friend-push/drain';
const issuer = 'https://token.actions.githubusercontent.com';
const jwksUrl = `${issuer}/.well-known/jwks`;
const repository = 'kokura-yuta/kintore-pass';
const workflow = `${repository}/.github/workflows/friend-push.yml@refs/heads/main`;
type SigningKey = JsonWebKey & {kid?: string; use?: string; alg?: string};
let cached: {keys: SigningKey[]; expires: number} | undefined;

function decode(part: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(part)) throw new Error('Invalid token');
  const raw = atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '='));
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}

export async function verifyPushJob(
  request: Request,
  options: {fetcher?: typeof fetch; now?: number; rejected?: (reason: string) => void} = {},
): Promise<boolean> {
  const reject = (reason: string) => {options.rejected?.(reason);return false;};
  try {
    const auth = request.headers.get('authorization') ?? '';
    if (!auth.startsWith('Bearer ') || auth.length > 16_384) return reject('format');
    const parts = auth.slice(7).split('.');
    if (parts.length !== 3) return reject('format');
    const header = JSON.parse(new TextDecoder().decode(decode(parts[0])));
    const claims = JSON.parse(new TextDecoder().decode(decode(parts[1])));
    if (header.alg !== 'RS256' || header.typ !== 'JWT' || typeof header.kid !== 'string' || header.kid.length > 256 || header.crit) return reject('header');
    const now = options.now ?? Math.floor(Date.now() / 1000);
    const times = [claims.iat, claims.nbf, claims.exp];
    if (!times.every(value => typeof value === 'number' && Number.isFinite(value))) return reject('time-type');
    if (claims.exp <= now || claims.nbf > now + 30 || claims.iat > now + 30 || claims.iat < now - 900 || claims.exp <= claims.iat || claims.exp - claims.iat > 900) return reject('time');
    // Check immutable IDs as well as names: a renamed/transferred/forked repo is not trusted.
    if (claims.iss !== issuer || claims.aud !== PUSH_JOB_AUDIENCE ||
        claims.repository !== repository || claims.repository_id !== '1325003866' ||
        claims.repository_owner_id !== '289435290' || claims.ref !== 'refs/heads/main' ||
        claims.workflow_ref !== workflow || claims.runner_environment !== 'github-hosted' ||
        !['schedule', 'workflow_dispatch'].includes(claims.event_name)) return reject('scope');
    if (claims.job_workflow_ref && claims.job_workflow_ref !== workflow) return reject('job-workflow');
    // GitHub supports both legacy and immutable subject forms. No environment/PR subjects.
    if (![ `repo:${repository}:ref:refs/heads/main`,
      'repo:kokura-yuta@289435290/kintore-pass@1325003866:ref:refs/heads/main',
    ].includes(claims.sub)) return reject('subject');
    let keys = options.fetcher ? undefined : cached;
    if (!keys || keys.expires <= now) {
      const response = await (options.fetcher ?? fetch)(jwksUrl, {
        redirect: 'error', signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return reject('key-fetch');
      const data = await response.json() as {keys?: SigningKey[]};
      if (!Array.isArray(data.keys) || data.keys.length > 30) return reject('key-format');
      keys = {keys: data.keys, expires: now + 300};
      if (!options.fetcher) cached = keys;
    }
    const jwk = keys.keys.find(key => key.kid === header.kid && key.kty === 'RSA' && key.use === 'sig' && key.alg === 'RS256');
    if (!jwk) return reject('key-missing');
    const key = await crypto.subtle.importKey('jwk', jwk, {name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256'}, false, ['verify']);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    return valid || reject('signature');
  } catch {
    // Never log bearer tokens, JWT payloads, push tokens, or provider responses.
    return reject('verification-exception');
  }
}

export async function pushJobEndpoint(request: Request, deps: {
  verify: (request: Request) => Promise<boolean>;
  ready: () => boolean;
  drain: () => Promise<unknown>;
}): Promise<Response> {
  const headers = {'Cache-Control': 'no-store'};
  if (request.method !== 'POST') return new Response(null, {status: 405, headers: {...headers, Allow: 'POST'}});
  if (!await deps.verify(request)) return Response.json({error: 'Unauthorized'}, {status: 401, headers});
  if (!deps.ready()) return Response.json({status: 'disabled'}, {status: 503, headers});
  try {
    await deps.drain();
    return Response.json({status: 'completed'}, {headers});
  } catch {
    return Response.json({error: 'Notification job failed'}, {status: 503, headers});
  }
}
