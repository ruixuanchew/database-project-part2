require('dotenv').config(); // Ensure this is at the top
const { MongoClient } = require('mongodb');
console.log(process.env.DB_HOST, process.env.DB_PORT, process.env.DB_PROJECT)
// Construct the MongoDB URI using environment variables
const uri = `mongodb://${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_PROJECT}`;

// Create a new MongoDB client without deprecated options
const client = new MongoClient(uri);

async function connectToDatabase() {
  try {
    // Connect to the MongoDB server
    await client.connect();
    console.log('Connected to the MongoDB database.');

    // Access the specific database (replaces the MySQL `database` option)
    const db = client.db(process.env.DB_NAME);

    return db; // Export the database connection
  } catch (err) {
    console.error('Error connecting to the MongoDB database:', err);
    process.exit(1);
  }
}

// Export the connection function
module.exports = connectToDatabase;