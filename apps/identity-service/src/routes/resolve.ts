import { FastifyPluginAsync } from 'fastify';
import { resolveWallet } from '../services/resolver.js';

const resolveRoute: FastifyPluginAsync = async (fastify) => {
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
  }, async (request, reply) => {
    const { domain, handle } = request.query as { domain: string; handle?: string };

    const wallet = await resolveWallet(domain, handle);
    if (!wallet) {
      return reply.status(404).send({ error: 'Wallet not found' });
    }

    return { wallet };
  });
};

export default resolveRoute;