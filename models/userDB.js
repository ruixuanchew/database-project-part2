"use strict";

const connectToDatabase = require('../js/db');
const { ObjectId } = require('mongodb'); 
const User = require('./user');

class UserDB {

    async getAllUsers(request, respond) {
        try {
            const db = await connectToDatabase();
            const users = await db.collection('users').find({}).toArray();
            respond.json(users);
        } catch (error) {
            respond.status(500).json({ error: "Database query error" });
        }
    }

    async getUserByUsername(username, callback) {
        try {
            const db = await connectToDatabase();
            
            // Fetch the user by username
            const user = await db.collection('users').findOne({ username: username });
    
            if (user) {
                callback(null, user);  // Pass user data to callback
            } else {
                callback(new Error('User not found'), null);  // Pass error if user not found
            }
        } catch (error) {
            console.error("Database query error:", error);
            callback(error, null);  // Pass error to callback
        }
    }
    

    async addUser(request, respond) {
        const db = await connectToDatabase();
        const session = db.client.startSession();
        try {
            session.startTransaction(); 
            const existingUser = await db.collection('users').findOne({
                $or: [
                    { email: request.body.email },
                    { username: request.body.username }
                ]
            });
    
            if (existingUser) {
                if (existingUser.email === request.body.email) {
                    return respond.status(409).json({ success: false, message: 'Email already exists' });
                }
                if (existingUser.username === request.body.username) {
                    return respond.status(409).json({ success: false, message: 'Username already exists' });
                }
            }

            const userObject = new User(
                null,
                request.body.username,
                request.body.email,
                request.body.password
            );
    
            const result = await db.collection('users').insertOne({
                username: userObject.getUsername(),
                email: userObject.getEmail(),
                password: userObject.getPassword()
            });
            respond.json({ success: true, message: "User registered successfully", result });
            await session.commitTransaction();
        } catch (error) {
            respond.status(500).json({ success: false, message: "Database insertion error", error: error.message });
            await session.abortTransaction();
        }finally {
            session.endSession();
        }
    }
    
    async updateUser(request, respond) {
        const db = await connectToDatabase();
        const session = db.client.startSession();
        try {
            const userId = request.params.id;
            const newUsername = request.body.username;
            session.startTransaction(); 
    
            // Convert userId to an ObjectId for MongoDB
            const objectId = new ObjectId(userId);
    
            // Update the user's username in the database
            const result = await db.collection('users').updateOne(
                { _id: objectId },         // Filter by user ID
                { $set: { username: newUsername } } // Update username
            );
    
            if (result.matchedCount === 0) {
                return respond.status(404).json({ success: false, message: 'User not found' });
            }
    
            respond.status(200).json({ success: true, message: 'User updated successfully', result });
            await session.commitTransaction();
        } catch (error) {
            console.error("Error updating user:", error);
            respond.status(500).json({ success: false, message: 'Database update error', error: error.message });
            await session.abortTransaction();
        }finally {
            session.endSession();
        }
    }

    async deleteUser(request, respond) {
        const db = await connectToDatabase();
        const session = db.client.startSession();
        try{
            const userId = request.params.id;
            const objectId = new ObjectId(userId);
            session.startTransaction(); 

            const result = await db.collection('users').deleteOne({ _id: objectId });
            respond.json(result);
            await session.commitTransaction();
        }catch (error) {
            console.error("Database deletion error:", error);
            respond.status(500).json({ error: "Database deletion error" });
            await session.abortTransaction();
        }finally {
            session.endSession();
        }
    }
}

module.exports = UserDB;
