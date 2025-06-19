const { MongoClient } = require('mongodb');

// ✅ Direct connection to the LoadBalancer, no replicaSet DNS issues
const MONGO_URI = 'mongodb://admin:Aa17935!@172.16.10.242:27017/admin?directConnection=true';

let client;

async function getMongoClient() {
  if (!client) {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
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
