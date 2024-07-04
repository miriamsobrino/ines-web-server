import mongoose from 'mongoose';
import { config } from 'dotenv';
//MONGO_URI='mongodb+srv://test:testdatabase@web-ines.ogi9rcr.mongodb.net/?retryWrites=true&w=majority&appName=web-ines'
config();

const MONGO_URI = process.env.MONGO_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected');
  } catch (err) {
    console.error(err.message);
  }
};

export default connectDB;
