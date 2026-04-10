import { resolveWallet } from '../services/resolver.js';

type ResolveQuery = { domain: string; handle?: string };
type ResolveSuccess = { wallet: string };
type ResolveError = { error: string };

interface ReplyLike {
  status(code: number): ReplyLike;
  send(payload: ResolveError): ResolveError;
}

interface RequestLike {
  query: ResolveQuery;
}

interface FastifyLike {
  get(
    path: string,
    options: unknown,
    handler: (request: RequestLike, reply: ReplyLike) => Promise<ResolveSuccess | ResolveError>
  ): void;
}

type FastifyPluginAsyncLike = (fastify: FastifyLike) => Promise<void>;

const resolveRoute: FastifyPluginAsyncLike = async (fastify: FastifyLike) => {
  fastify.get('/', {
    schema: {
      querystring: {
        type: 'object',
        required: ['domain'],
        properties: {
          domain: { type: 'string' },
          handle: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            wallet: { type: 'string' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request: RequestLike, reply: ReplyLike) => {
    const { domain, handle } = request.query;

    const wallet = await resolveWallet(domain, handle);
    if (!wallet) {
      return reply.status(404).send({ error: 'Wallet not found' });
    }

    return { wallet };
  });
};

export default resolveRoute;