// Limitador de pedidos em memória (sliding window), por instância.
// Best-effort: protege contra abuso/força-bruta/DoS de baixo custo.
// Nota: o estado é por instância e reinicia num novo arranque — suficiente como
// primeira linha de defesa contra automação e repetição abusiva de pedidos.

type Hit = { count: number; reset: number };

const buckets = new Map<string, Hit>();

// Varredura periódica para evitar crescimento ilimitado do Map.
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, hit] of buckets) {
    if (hit.reset <= now) buckets.delete(key);
  }
}

export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

/**
 * Regista um pedido e indica se está dentro do limite.
 * @param request pedido recebido (para extrair o IP)
 * @param bucket nome lógico do limite (ex.: 'login', 'chat')
 * @param limit nº máximo de pedidos permitidos na janela
 * @param windowMs duração da janela em ms
 */
export function rateLimit(
  request: Request,
  bucket: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  sweep(now);
  const ip = getClientIp(request);
  const key = `${bucket}:${ip}`;
  const existing = buckets.get(key);

  if (!existing || existing.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  if (existing.count >= limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((existing.reset - now) / 1000)) };
  }

  existing.count += 1;
  return { ok: true, retryAfter: 0 };
}

/** Resposta 429 padrão (em Português) para pedidos acima do limite. */
export function tooManyRequests(retryAfter: number): Response {
  return new Response(
    JSON.stringify({ error: 'Demasiados pedidos. Tente novamente mais tarde.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter || 60),
      },
    },
  );
}
