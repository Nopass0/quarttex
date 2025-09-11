import { db } from './src/db';

async function testAggregator() {
  try {
    const aggregator = await db.aggregator.findUnique({
      where: { id: 'cmfcue3ww0000ikn5tq50b8bg' },
      select: {
        id: true,
        name: true,
        requiresInsuranceDeposit: true
      }
    });
    
    console.log('Aggregator:', aggregator);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

testAggregator();
