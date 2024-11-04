"use strict";

const connectToDatabase = require('../js/db');
const Nutrition = require('./nutrition');
const { ObjectId } = require('mongodb'); 

class NutritionDB {

    // Get all nutrition entries
    getAllNutrition(request, respond) {
        const sql = "SELECT * FROM nutrition";
        db.query(sql, (error, result) => {
            if (error) {
                throw error;
            }
            respond.json(result);
        });
    }

    // Get all nutrition entry by recipe ID
    async getNutritionById(request, respond) {
        const recipeId = request.params.id;
        try {
            const db = await connectToDatabase();
            const objectId = new ObjectId(recipeId);
    
            const nutritionData = await db.collection('recipes').aggregate([
                { $match: { _id: objectId } }, 
                {
                    $lookup: {
                        from: 'nutrition', 
                        let: { ingredients: '$ingredients' }, 
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $regexMatch: {
                                            input: '$$ingredients', 
                                            regex: { $concat: [ '(^|[^a-zA-Z])', '$food', '([^a-zA-Z]|$)' ] }, 
                                            options: 'i' 
                                        }
                                    }
                                }
                            },
                            {
                                $project: {
                                    food: 1,
                                    calories: 1,
                                    protein: 1,
                                    fat: 1,
                                    fiber: 1,
                                    carbs: 1
                                }
                            }
                        ],
                        as: 'nutritionInfo' 
                    }
                },
                {
                    $unwind: {
                        path: '$nutritionInfo',
                        preserveNullAndEmptyArrays: true 
                    }
                },
                {
                    $project: {
                        nutrition: '$nutritionInfo' 
                    }
                }
            ]).toArray();
            console.log("Nutrition Data:", nutritionData);
            
            if (nutritionData.length > 0) {
                respond.json(nutritionData);
            } else {
                respond.status(404).json({ message: 'Nutrition entry not found' });
            }
        } catch (error) {
            console.error("Database query error:", error);
            respond.status(500).json({ error: "Database query error" });
        }
    }
}    


module.exports = NutritionDB;
