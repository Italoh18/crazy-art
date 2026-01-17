
const MONGODB_API_KEY = process.env.MONGODB_API_KEY || '';
const MONGODB_URL = process.env.MONGODB_URL || '';
const APP_ID = process.env.MONGODB_APP_ID || '';

interface MongoRequest {
  collection: string;
  database: string;
  dataSource: string;
  [key: string]: any;
}

async function mongoRequest(action: string, payload: MongoRequest) {
  if (!MONGODB_URL || !MONGODB_API_KEY) {
    console.warn("MongoDB credentials not configured. Using mock response.");
    return null;
  }

  const response = await fetch(`${MONGODB_URL}/action/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': MONGODB_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`MongoDB API Error: ${error}`);
  }

  return response.json();
}

const config = {
  database: 'crazy_art',
  dataSource: 'Cluster0', // Nome padrão do seu cluster no Atlas
};

export const db = {
  async find(collection: string, filter = {}) {
    const res = await mongoRequest('find', { ...config, collection, filter });
    return res?.documents || [];
  },

  async insertOne(collection: string, document: any) {
    const res = await mongoRequest('insertOne', { ...config, collection, document });
    return res?.insertedId;
  },

  async updateOne(collection: string, filter: any, update: any) {
    return mongoRequest('updateOne', { ...config, collection, filter, update: { $set: update } });
  },

  async deleteOne(collection: string, filter: any) {
    return mongoRequest('deleteOne', { ...config, collection, filter });
  }
};
