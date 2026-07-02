import * as dotenv from 'dotenv';
import { setupBot } from './bot/bot.js';
import { prisma } from './prisma/client.js';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN || BOT_TOKEN === 'dummy') {
  console.error('Error: BOT_TOKEN is not defined in .env');
  process.exit(1);
}

const bot = setupBot(BOT_TOKEN);

async function bootstrap() {
  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('Database connected.');

    bot.launch();
    console.log('Bot is running.');

    // Enable graceful stop
    process.once('SIGINT', () => {
      bot.stop('SIGINT');
      prisma.$disconnect();
    });
    process.once('SIGTERM', () => {
      bot.stop('SIGTERM');
      prisma.$disconnect();
    });
  } catch (e) {
    console.error('Failed to start the bot', e);
    await prisma.$disconnect();
    process.exit(1);
  }
}

bootstrap();
