import mongoose from 'mongoose';

async function clearDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/securechat');
    console.log('Connected to MongoDB');

    // Get all collections
    const collections = await mongoose.connection.db!.collections();

    // Clear each collection
    for (const collection of collections) {
      await collection.deleteMany({});
      console.log(`Cleared collection: ${collection.collectionName}`);
    }

    console.log('\n✅ Database cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  }
}

clearDatabase();
