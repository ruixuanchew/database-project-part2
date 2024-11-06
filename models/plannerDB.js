"use strict";

const connectToDatabase = require('../js/db');
const { ObjectId } = require('mongodb'); 
const Planner = require('./planner');

class PlannerDB {

    // Get all plans 
    async getAllPlans(request, respond) {
        try {
            const db = await connectToDatabase();
            const planners = await db.collection('planners').find({}).toArray();
            respond.json(planners);
        } catch (error) {
            respond.status(500).json({ error: "Database query error" });
        }
    }

    // Get plans by user selected date
    async getPlansByDate(request, respond) {
        try {
            const db = await connectToDatabase();
            const date = request.params.date;
            const result = await db.collection('planners').find({ date: date }).toArray();
            respond.json(result);
        } catch (error) {
            console.error('Error fetching plans by date:', error);
            respond.status(500).json({ error: error.message });
        }
    }
    
    // Get plans by plan ID
    async getPlanById(request, respond) {
        try {
            const db = await connectToDatabase();
    
            const plannerId = request.params.id;

            const objectId = new ObjectId(plannerId);

            const planner = await db.collection('planners').findOne({ _id: objectId }); 
            if (planner) {
                respond.json(planner);
            } else {
                respond.status(404).json({ message: 'Plan not found' });
            }
        } catch (error) {
            console.error("Database query error:", error); 
            respond.status(500).json({ error: "Database query error" });
        }
    }

    // Get plans by user ID
    async getPlanByUserId(request, respond) {
        try {
            const db = await connectToDatabase();
            const userId = request.params.user_id;
            // const objectId = new ObjectId(userId);

            const result = await db.collection('planners').find({ user_id: userId }).toArray();
            respond.json(result);
        } catch (error) {
            console.error('Error fetching plans by date:', error);
            respond.status(500).json({ error: error.message });
        }
    }    

    // Get group plans 
    async getGroupedPlans(request, respond) {
        try {
            const db = await connectToDatabase();
            const userId = request.params.id;
    
            console.log("Request User ID:", userId);
    
            const pipeline = [
                { $match: { user_id: userId } },
                { $group: { _id: "$date", total_plans: { $sum: 1 } } },
                { $project: { date: "$_id", total_plans: 1, _id: 0 } }
            ];
    
            const result = await db.collection('planners').aggregate(pipeline).toArray();

            respond.json(result);
        } catch (error) {
            console.error('Error fetching plans grouped by date:', error);
            respond.status(500).json({ error: error.message });
        }
    }

    // Add plans
    async addPlan(request, respond) {
        try {
            const db = await connectToDatabase();
            const plannerObject = new Planner(
                null,
                request.body.user_id,
                request.body.recipe_id,
                request.body.title,
                request.body.description,
                request.body.time,
                request.body.date
            );
    
            const result = await db.collection('planners').insertOne({
                user_id: plannerObject.getUserId(),
                recipe_id: plannerObject.getRecipeId(),
                title: plannerObject.getTitle(),
                description: plannerObject.getDescription(),
                time: plannerObject.getTime(),
                date: plannerObject.getDate(),
            });
    
            // Only respond once
            respond.json(result);
        } catch (error) {
            // Only respond with an error if no response was sent
            console.error("Database insertion error:", error);
            if (!respond.headersSent) {  // Check if headers are already sent
                respond.status(500).json({ error: "Database insertion error" });
            }
        }
    }
    

    // Update Plans
    async updatePlan(request, respond) {
        const db = await connectToDatabase();
        const plannerId = request.params.id;
        const objectId = new ObjectId(plannerId); 

        const fieldsToUpdate = {};

        if (request.body.recipe_id) fieldsToUpdate.recipe_id = request.body.recipe_id;
        if (request.body.title) fieldsToUpdate.title = request.body.title;
        if (request.body.description) fieldsToUpdate.description = request.body.description;
        if (request.body.time) fieldsToUpdate.time = request.body.time;
        if (request.body.date) fieldsToUpdate.date = request.body.date;

        if (Object.keys(fieldsToUpdate).length === 0) {
            return respond.status(400).json({ message: "No fields to update" });
        }

        try {
            const result = await db.collection('planners').updateOne(
                { _id: objectId },
                { $set: fieldsToUpdate }
            );
            respond.json(result);
        } catch (error) {
            console.error('Error updating plan:', error);
            respond.status(500).json({ error: error.message });
        }
    }

    // Delete plans
    async deletePlan(request, respond) {
        try {
            const db = await connectToDatabase();
            const plannerId = request.params.id;
            const objectId = new ObjectId(plannerId); 
            
            const result = await db.collection('planners').deleteOne({ _id: objectId });
            respond.json(result);
        } catch (error) {
            console.error("Database deletion error:", error);
            respond.status(500).json({ error: "Database deletion error" });
        }
    }

}
module.exports = PlannerDB;
