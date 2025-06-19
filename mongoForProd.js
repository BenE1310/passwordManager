// mongo.js
const { MongoClient } = require('mongodb');

let client;

async function getMongoClient() {
  if (!client) {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
    client = new MongoClient(uri);
    await client.connect();
    console.log('✅ Connected to MongoDB');
  }
  return client;
}

async function getAuthDb() {
  const client = await getMongoClient();
  return client.db('auth');
}

async function getPasswordsDb() {
  const client = await getMongoClient();
  return client.db('passwords');
}

module.exports = { getMongoClient, getAuthDb, getPasswordsDb };
