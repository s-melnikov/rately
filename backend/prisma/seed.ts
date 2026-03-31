import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
  {
    name: 'Sony WH-1000XM5',
    description:
      'Industry-leading noise canceling headphones with Auto Noise Canceling Optimizer. Up to 30-hour battery life with quick charging (3 min charge for 3 hours playback).',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    category: 'Electronics',
  },
  {
    name: 'Apple MacBook Air M3',
    description:
      'Supercharged by the next-generation M3 chip, MacBook Air is faster and more capable than ever. With up to 18 hours of battery life and a stunning Liquid Retina display.',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400',
    category: 'Electronics',
  },
  {
    name: 'Samsung 4K OLED Monitor 27"',
    description:
      'Experience stunning color accuracy with this 27-inch 4K OLED display. Perfect for creative professionals with 0.1ms response time and 144Hz refresh rate.',
    imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400',
    category: 'Electronics',
  },
  {
    name: 'The Pragmatic Programmer',
    description:
      'The classic book about software development philosophy. Covers topics from career development to architectural techniques for keeping your code flexible and easy to adapt.',
    imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
    category: 'Books',
  },
  {
    name: 'Clean Code by Robert Martin',
    description:
      'A handbook of agile software craftsmanship. Learn how to write code that is easy to read, maintain, and extend. Essential reading for every professional developer.',
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400',
    category: 'Books',
  },
  {
    name: 'Designing Data-Intensive Applications',
    description:
      'The big ideas behind reliable, scalable, and maintainable systems. An in-depth exploration of data storage, processing, and retrieval in distributed systems.',
    imageUrl: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400',
    category: 'Books',
  },
  {
    name: 'Herman Miller Aeron Chair',
    description:
      'Ergonomically engineered office chair with PostureFit SL support and breathable 8Z PELLICLE suspension. Supports a full range of sitting positions for all-day comfort.',
    imageUrl: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400',
    category: 'Office',
  },
  {
    name: 'Standing Desk Converter Pro',
    description:
      'Transform any desk into a sit-stand workstation. Smooth pneumatic lift system adjusts from 4.7" to 19.7" height. Holds up to 35 lbs of equipment.',
    imageUrl: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400',
    category: 'Office',
  },
  {
    name: 'Logitech MX Master 3S',
    description:
      'High-performance wireless mouse with MagSpeed electromagnetic scrolling and ultra-precise 8K DPI tracking on any surface. Works on glass. 70-day battery life.',
    imageUrl: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400',
    category: 'Electronics',
  },
  {
    name: 'Keychron Q1 Mechanical Keyboard',
    description:
      'Premium hot-swappable mechanical keyboard with aluminum body and south-facing RGB. Fully compatible with QMK/VIA for deep customization. Available in multiple switch options.',
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400',
    category: 'Electronics',
  },
];

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.review.deleteMany();
  await prisma.product.deleteMany();

  // Create products
  const createdProducts = await Promise.all(
    products.map((p) => prisma.product.create({ data: p })),
  );

  // Seed some reviews
  const reviews = [
    {
      productId: createdProducts[0].id, // Sony headphones
      rating: 5,
      title: 'Best headphones I have ever owned',
      body: 'The noise cancellation is absolutely incredible. I use these on flights and in busy coffee shops and it feels like being in a quiet room. Sound quality is top-notch too.',
      username: 'AudioPhileDave',
      email: 'dave@example.com',
    },
    {
      productId: createdProducts[0].id,
      rating: 4,
      title: 'Great ANC, slightly uncomfortable after hours',
      body: 'The noise cancellation lives up to the hype. My only complaint is they get a bit tight after 4+ hours of wear. Sound quality is excellent for music and calls.',
      username: 'TechReviewer99',
      email: 'techreviewer@example.com',
    },
    {
      productId: createdProducts[1].id, // MacBook Air M3
      rating: 5,
      title: 'Incredibly fast and silent',
      body: 'Coming from an Intel MacBook, the difference is night and day. No fan noise, runs cool all day, and the battery genuinely lasts 18 hours with real workloads.',
      username: 'DevMacUser',
      email: 'devmac@example.com',
    },
    {
      productId: createdProducts[3].id, // Pragmatic Programmer
      rating: 5,
      title: 'A must-read for every developer',
      body: 'This book fundamentally changed how I think about software development. The DRY principle, orthogonality, tracer bullets — concepts I use every day. Essential reading.',
      username: 'SeniorDev2024',
      email: 'seniordev@example.com',
    },
    {
      productId: createdProducts[3].id,
      rating: 4,
      title: 'Timeless wisdom, slightly dated examples',
      body: 'The core principles are as relevant as ever. Some code examples feel dated but the philosophy transcends any language or framework. Worth every penny.',
      username: 'CodeCrafter',
      email: 'codecrafter@example.com',
    },
    {
      productId: createdProducts[6].id, // Herman Miller
      rating: 5,
      title: 'Worth every penny for back health',
      body: 'Had chronic back pain from cheaper chairs. After 6 months in the Aeron, pain is almost gone. The lumbar support is exactly what my lower back needed.',
      username: 'RemoteWorker',
      email: 'remote@example.com',
    },
  ];

  await Promise.all(reviews.map((r) => prisma.review.create({ data: r })));

  console.log(`Seeded ${createdProducts.length} products and ${reviews.length} reviews.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
