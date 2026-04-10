import { FastifyPluginAsync } from 'fastify';
import { fetchCreatorRevenue } from '../services/bags.js';

const revenueRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', {
    schema: {
      querystring: {
        type: 'object',
        required: ['wallet'],
        properties: {
          wallet: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { wallet } = request.query as { wallet: string };
    try {
      const revenue = await fetchCreatorRevenue(wallet);
      return { totalRevenueUSD: revenue };
    } catch (err) {
      return reply.status(500).send({ error: 'Failed to fetch revenue' });
    }
  });
};

export default revenueRoute;