import mongoose from 'mongoose';

export async function connectMongoDB(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vaultgames';

  mongoose.connection.on('connected', () => console.log('✅ MongoDB connected'));
  mongoose.connection.on('error', (err) => console.error('❌ MongoDB error:', err));
  mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));

  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
}
