const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    mongoose.set('bufferCommands', false); // Fail fast, don't hang requests
    if (!process.env.MONGO_URI) {
      console.log('[Storage Mode] MONGO_URI not configured. Operating in In-Memory Mode.');
      return false;
    }
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      family: 4
    });
    console.log(`[Storage Mode] MongoDB Connected successfully: ${conn.connection.host}`);

    // Trigger seed sync
    const seedMongoDB = require('./seed');
    await seedMongoDB();

    return true;
  } catch (error) {
    console.warn(`[Storage Mode] MongoDB unavailable (${error.message}). Falling back gracefully to In-Memory Mode.`);
    return false;
  }
};

module.exports = connectDB;
