import { PrismaClient } from '@prisma/client';
import { categorize } from '../src/utils/categorizer';

const prisma = new PrismaClient();

const MERCHANTS = [
  { name: 'Carrefour', amount: [1500, 8000] },
  { name: 'Spotify', amount: [800, 800] },
  { name: 'Netflix', amount: [2000, 2000] },
  { name: 'Uber', amount: [500, 3000] },
  { name: 'Farmacity', amount: [300, 4000] },
  { name: 'YPF', amount: [5000, 15000] },
  { name: 'Coto', amount: [2000, 12000] },
  { name: 'Disney+', amount: [1500, 1500] },
  { name: 'McDonalds', amount: [800, 2500] },
  { name: 'Edesur', amount: [3000, 8000] },
  { name: 'Personal', amount: [2500, 6000] },
  { name: 'Rappi', amount: [1000, 4000] },
  { name: 'Zara', amount: [5000, 25000] },
  { name: 'Steam', amount: [1000, 8000] },
  { name: 'Cabify', amount: [600, 2500] },
];

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - randomBetween(0, daysAgo));
  d.setHours(randomBetween(8, 22), randomBetween(0, 59));
  return d;
}

async function main() {
  console.log('🌱 Seeding database with dummy payments...');

  await prisma.category.deleteMany();
  await prisma.payment.deleteMany();

  let count = 0;
  for (let i = 0; i < 80; i++) {
    const merchant = MERCHANTS[Math.floor(Math.random() * MERCHANTS.length)];
    const [min, max] = merchant.amount;
    const amount = randomBetween(min, max);
    const mpId = `DUMMY_${Date.now()}_${i}_${Math.random().toString(36).slice(2)}`;

    const payment = await prisma.payment.create({
      data: {
        mpId,
        amount,
        currency: 'ARS',
        date: randomDate(90),
        merchantName: merchant.name,
        description: `Compra en ${merchant.name}`,
        status: 'approved',
        paymentMethod: Math.random() > 0.5 ? 'debit_card' : 'credit_card',
        paymentType: 'regular_payment',
        installments: Math.random() > 0.7 ? randomBetween(2, 12) : 1,
      },
    });

    await prisma.category.create({
      data: {
        paymentId: payment.id,
        name: categorize(merchant.name),
        isManual: false,
      },
    });

    count++;
  }

  console.log(`✅ Seed completado: ${count} pagos creados`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
