const { MongoClient } = require('mongodb');

const MONGO_USER = process.env.MONGO_INITDB_ROOT_USERNAME || 'admin';
const MONGO_PASS = process.env.MONGO_INITDB_ROOT_PASSWORD || 'Aa17935!';
const REPLICA_SET = process.env.MONGO_REPLICA_SET || 'rs0';

const MONGO_URI = `mongodb://${MONGO_USER}:${MONGO_PASS}@mongo-0.mongo.mongodb.svc.cluster.local:27017,mongo-1.mongo.mongodb.svc.cluster.local:27017,mongo-2.mongo.mongodb.svc.cluster.local:27017/admin?replicaSet=${REPLICA_SET}`;

let client;

async function getMongoClient() {
  if (!client) {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB Replica Set');
  }
  return client;
}

async function getPasswordsDb() {
  const client = await getMongoClient();
  return client.db('pass_folder_manager');
}

async function getAuthDb() {
  const client = await getMongoClient();
  return client.db('users_auth');
}

module.exports = {
  getPasswordsDb,
  getAuthDb
};

