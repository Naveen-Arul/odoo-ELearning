/**
 * SkillForge AI - Database Configuration
 * MongoDB Atlas connection using Mongoose
 */

const mongoose = require('mongoose');

// Check if running on Vercel
const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    const fallbackURI = process.env.MONGODB_URI_FALLBACK;

    if (!mongoURI) {
      console.error('❌ MONGODB_URI is not defined!');
      console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('MONGO') || k.includes('DB')));
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('🔄 Connecting to MongoDB...');
    console.log('URI prefix:', mongoURI.substring(0, 30) + '...');

    const buildOptions = (uri) => {
      const isSrv = uri.startsWith('mongodb+srv://');
      return {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000, // Increased for serverless cold starts
        socketTimeoutMS: 45000,
        tls: isSrv,
        tlsAllowInvalidCertificates: false,
        retryWrites: true
      };
    };

    const connectWithUri = async (uri) => {
      const options = buildOptions(uri);
      return mongoose.connect(uri, options);
    };

    let conn;
    try {
      conn = await connectWithUri(mongoURI);
    } catch (primaryError) {
      console.error('Primary connection error:', primaryError.message);

      // On Vercel, don't try fallback (localhost won't work)
      if (isVercel) {
        console.error('❌ MongoDB Atlas connection failed on Vercel');
        console.error('Make sure:');
        console.error('1. MONGODB_URI env var is set correctly in Vercel');
        console.error('2. IP 0.0.0.0/0 is whitelisted in MongoDB Atlas');
        throw primaryError;
      }

      if (fallbackURI) {
        console.warn('⚠️ Primary MongoDB connection failed. Attempting fallback URI...');
        conn = await connectWithUri(fallbackURI);
      } else {
        throw primaryError;
      }
    }

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    // Graceful shutdown (not needed for serverless)
    if (!isVercel) {
      process.on('SIGINT', async () => {
        await mongoose.connection.close();
        console.log('MongoDB connection closed through app termination');
        process.exit(0);
      });
    }

    return conn;
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    if (isVercel) {
      // On Vercel, throw error to show in logs
      throw error;
    }
    process.exit(1);
  }
};

module.exports = connectDB;

