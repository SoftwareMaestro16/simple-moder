import mongoose from "mongoose";
import 'dotenv/config';

const dbConnect = process.env.DB_CONNECT;

async function connectToDatabase() {
  try {
    await mongoose.connect(dbConnect, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Connection error: ', err);
    process.exit(1);
  }
};

export default connectToDatabase;