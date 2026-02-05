import mongoose from "mongoose";

const globalForMongo = globalThis as unknown as {
  mongoConn?: typeof mongoose;
  mongoPromise?: Promise<typeof mongoose>;
};

export async function connectMongo() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set. MongoDB is not required for this application.");
  }

  if (globalForMongo.mongoConn) return globalForMongo.mongoConn;

  if (!globalForMongo.mongoPromise) {
    globalForMongo.mongoPromise = mongoose.connect(mongoUri, {
      autoIndex: process.env.NODE_ENV === "development"
    });
  }

  globalForMongo.mongoConn = await globalForMongo.mongoPromise;
  return globalForMongo.mongoConn;
}
