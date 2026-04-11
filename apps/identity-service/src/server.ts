import Fastify, { FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import dotenvFlow from 'dotenv-flow';
import resolveRoute from './routes/resolve.js';
import revenueRoute from './routes/revenue.js';
import streamsRoute from './routes/streams.js';
import { initRedis } from './services/cache.js';

dotenvFlow.config();

async function main() {
	const fastify = Fastify({ logger: true });
	await fastify.register(cors, { origin: true });
	await fastify.register(rateLimit, {
		max: Number(process.env.RATE_LIMIT_MAX) || 100,
		timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
		allowList: (request: FastifyRequest) => request.url === '/health',
	});

	// Initialize Redis
	await initRedis();

	// Routes
	fastify.get('/health', async () => ({ status: 'ok' }));
	fastify.register(resolveRoute, { prefix: '/resolve' });
	fastify.register(revenueRoute, { prefix: '/revenue' });
	fastify.register(streamsRoute, { prefix: '/streams' });

	const PORT = Number(process.env.PORT) || 3001;
	await fastify.listen({ port: PORT, host: '0.0.0.0' });
	console.log(`Identity service running on port ${PORT}`);
}

void main();