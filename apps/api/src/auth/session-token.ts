import type { FastifyRequest } from 'fastify';

export type RequestWithCookies = FastifyRequest & {
  cookies?: Record<string, string | undefined>;
};

export function readSessionToken(
  request: RequestWithCookies,
  cookieName: string,
): string | undefined {
  const cookieToken = request.cookies?.[cookieName];

  if (cookieToken) {
    return cookieToken;
  }

  const authorization = readHeader(request.headers.authorization);

  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim();
  }

  return undefined;
}

function readHeader(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  return value?.[0];
}
