import { FastifyPluginAsync } from 'fastify';
import { fetchUserStreams } from '../services/bags.js';

const streamsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', {
    schema: {
      querystring: {
        type: 'object',
        required: ['sender', 'receiver'],
        properties: {
          sender: { type: 'string' },
          receiver: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { sender, receiver } = request.query as { sender: string; receiver: string };
    try {
      const streams = await fetchUserStreams(sender, receiver);
      return { streams };
    } catch (err) {
      return reply.status(500).send({ error: 'Failed to fetch streams' });
    }
  });
};

export default streamsRoute;