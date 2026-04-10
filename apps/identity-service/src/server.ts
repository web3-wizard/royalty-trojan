import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import resolveRoute from './routes/resolve.js';
import { initRedis } from './services/cache.js';

dotenv.config();

async function main() {
	const fastify = Fastify({ logger: true });
	await fastify.register(cors, { origin: true });

	// Initialize Redis
	await initRedis();

	// Routes
	fastify.get('/health', async () => ({ status: 'ok' }));
	fastify.register(resolveRoute, { prefix: '/resolve' });

	const PORT = Number(process.env.PORT) || 3001;
	await fastify.listen({ port: PORT, host: '0.0.0.0' });
	console.log(`Identity service running on port ${PORT}`);
}

void main();