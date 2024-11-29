"use strict";

const connectToDatabase = require('../js/db');
const { ObjectId } = require('mongodb');
const Recipe = require('./recipe');

class RecipeDB {
    async ensureIndexes() {
        try {
            const db = await connectToDatabase();
    
            // Create index on `name` and `search_terms` fields
            // Ignore "Index already exists" errors by wrapping in try-catch
            await Promise.all([
                db.collection('recipes').createIndex({ name: 1 }, { name: "name_1" }),
                db.collection('recipes').createIndex({ search_terms: 1 }, { name: "search_terms_1" }),
            ]);
    
            console.log("Indexes ensured successfully.");
        } catch (error) {
            if (error.codeName === "IndexOptionsConflict" || error.message.includes("Index already exists")) {
                console.log("Indexes already exist, skipping creation.");
            } else {
                console.error("Error ensuring indexes:", error);
                throw error; // Rethrow if it's a different error
            }
        }
    }    

    async getAllRecipes(request, respond) {
        try {
            const db = await connectToDatabase();
            const recipes = await db.collection('recipes').find({}).toArray();

            console.log("Fetched all recipes count:", recipes.length);
            respond.json(recipes);
        } catch (error) {
            console.error("Error fetching all recipes:", error);
            respond.status(500).json({ error: "Database query error" });
        }
    }

    async getSortedRecipes(request, respond) {
        try {
            const db = await connectToDatabase();
            const searchQuery = request.query.query ? request.query.query.toLowerCase() : '';
            const filters = request.query.filters ? request.query.filters.split(',').map(f => f.toLowerCase()) : [];
            const sortBy = request.query.sortBy || 'recipe_id';
            const sortDirection = request.query.sortDirection === 'DESC' ? -1 : 1;

            const query = {};

            // Initialize a single $or array
            const orConditions = [];

            // Apply search query filtering
            if (searchQuery) {
                orConditions.push(
                    { name: { $regex: searchQuery, $options: 'i' } },
                    { search_terms: { $regex: searchQuery, $options: 'i' } }
                );
            }

            // Apply additional filters and combine with search terms
            if (filters.length) {
                filters.forEach(filter => {
                    orConditions.push({ search_terms: { $regex: filter, $options: 'i' } });
                });
            }

            // If there are any conditions in $or, apply them
            if (orConditions.length > 0) {
                query.$or = orConditions;
            }

            // Build the aggregation pipeline
            const pipeline = [
                { $match: query }, // First, filter the recipes based on the search query
            ];

            // Add sorting logic
            if (sortBy === 'name') {
                pipeline.push({
                    $addFields: {
                        normalized_name: { $toLower: "$name" } // Normalize the name for case-insensitive sorting
                    }
                });
                pipeline.push({ $sort: { normalized_name: sortDirection } }); // Sort by normalized_name
            } else if (sortBy === 'serving_size') {
                pipeline.push({
                    $addFields: {
                        serving_mass: {
                            $toInt: {
                                $trim: {
                                    input: {
                                        $arrayElemAt: [
                                            { $split: [{ $arrayElemAt: [{ $split: ["$serving_size", "("] }, 1] }, "g"] },
                                            0
                                        ]
                                    }
                                }
                            }
                        }
                    }
                });
                pipeline.push({ $sort: { serving_mass: sortDirection } }); // Sort by serving_mass
            } else {
                pipeline.push({ $sort: { [sortBy]: sortDirection } }); // Sort by specified field
            }

            // Execute the aggregation pipeline
            const recipes = await db.collection('recipes').aggregate(pipeline).toArray();

            respond.json(recipes);
        } catch (error) {
            console.error("Error searching and sorting recipes:", error);
            respond.status(500).json({ error: "Database query error" });
        }
    }

    async getRecipeIdAndName(request, respond) {
        try {
            const db = await connectToDatabase();
            const recipes = await db.collection('recipes')
                .find({}, { projection: { recipe_id: 1, name: 1 } })
                .toArray();

            console.log("Fetched recipe IDs and names count:", recipes.length);
            respond.json(recipes);
        } catch (error) {
            console.error("Error fetching recipe IDs and names:", error);
            respond.status(500).json({ error: "Database query error" });
        }
    }

    async getRecipeBySearch(request, respond) {
        try {
            const db = await connectToDatabase();
            const searchQuery = request.query.query ? request.query.query.toLowerCase() : '';
            const filters = request.query.filters ? request.query.filters.split(',').map(f => f.toLowerCase()) : [];
            const sortBy = request.query.sortBy || 'recipe_id';
            const sortDirection = request.query.sortDirection === 'DESC' ? -1 : 1;

            const query = {};

            // Initialize a single $or array
            const orConditions = [];

            // Apply search query filtering
            if (searchQuery) {
                orConditions.push(
                    { name: { $regex: searchQuery, $options: 'i' } },
                    { search_terms: { $regex: searchQuery, $options: 'i' } }
                );
            }

            // Apply additional filters and combine with search terms
            if (filters.length) {
                filters.forEach(filter => {
                    orConditions.push({ search_terms: { $regex: filter, $options: 'i' } });
                });
            }

            // If there are any conditions in $or, apply them
            if (orConditions.length > 0) {
                query.$or = orConditions;
            }

            // Build the aggregation pipeline
            const pipeline = [
                { $match: query }, // First, filter the recipes based on the search query
            ];

            // Add sorting logic
            if (sortBy === 'name') {
                pipeline.push({
                    $addFields: {
                        normalized_name: { $toLower: "$name" } // Normalize the name for case-insensitive sorting
                    }
                });
                pipeline.push({ $sort: { normalized_name: sortDirection } }); // Sort by normalized_name
            } else if (sortBy === 'serving_size') {
                pipeline.push({
                    $addFields: {
                        serving_mass: {
                            $toInt: {
                                $trim: {
                                    input: {
                                        $arrayElemAt: [
                                            { $split: [{ $arrayElemAt: [{ $split: ["$serving_size", "("] }, 1] }, "g"] },
                                            0
                                        ]
                                    }
                                }
                            }
                        }
                    }
                });
                pipeline.push({ $sort: { serving_mass: sortDirection } }); // Sort by serving_mass
            } else {
                pipeline.push({ $sort: { [sortBy]: sortDirection } }); // Sort by specified field
            }

            // Execute the aggregation pipeline
            const recipes = await db.collection('recipes').aggregate(pipeline).toArray();

            console.log("Search Query:", searchQuery);
            console.log("Filters Applied:", filters);
            console.log("Sort By:", sortBy, "Sort Direction:", sortDirection);
            console.log("Fetched recipes count:", recipes.length)

            respond.json(recipes);
        } catch (error) {
            console.error("Error searching and sorting recipes:", error);
            respond.status(500).json({ error: "Database query error" });
        }
    }

    async getRecipeById(request, respond) {
        try {
            const db = await connectToDatabase();
            const recipeId = request.params.id;

            console.log("Fetching recipe by ID:", recipeId);

            const recipe = await db.collection('recipes').findOne({ _id: new ObjectId(recipeId) });

            if (recipe) {
                respond.json(recipe);
            } else {
                console.log("No recipe found with ID:", recipeId);
                respond.status(404).json({ message: 'Recipe not found' });
            }
        } catch (error) {
            console.error("Error fetching recipe by ID:", error);
            respond.status(500).json({ error: "Database query error" });
        }
    }

    async addRecipe(request, respond) {
        const db = await connectToDatabase();
        const session = db.client.startSession();
        try {
            session.startTransaction();
            const recipeObject = new Recipe(
                null,
                request.body.name,
                request.body.description,
                request.body.ingredients,
                request.body.ingredients_raw,
                request.body.serving_size,
                request.body.servings,
                request.body.steps,
                request.body.tags,
                request.body.search_terms
            );

            const result = await db.collection('recipes').insertOne({
                name: recipeObject.getName(),
                description: recipeObject.getDescription(),
                ingredients: recipeObject.getIngredients(),
                ingredients_raw: recipeObject.getIngredientsRaw(),
                serving_size: recipeObject.getServingSize(),
                servings: recipeObject.getServings(),
                steps: recipeObject.getSteps(),
                tags: recipeObject.getTags(),
                search_terms: recipeObject.getSearchTerms()
            });
            respond.json(result);
            await session.commitTransaction();
        } catch (error) {
            respond.status(500).json({ error: "Database insertion error" });
            await session.abortTransaction();
        } finally {
            session.endSession();
        }
    }

    async updateRecipe(request, respond) {
        try {
            const db = await connectToDatabase();
            const recipeId = request.params.id;
            const updatedFields = request.body;

            const result = await db.collection('recipes').updateOne(
                { _id: new ObjectId(recipeId) },
                { $set: updatedFields }
            );

            if (result.modifiedCount > 0) {
                respond.json({ message: "Recipe updated successfully" });
            } else {
                respond.status(404).json({ message: "Recipe not found" });
            }
        } catch (error) {
            console.error("Error updating recipe:", error);
            respond.status(500).json({ error: "Database update error" });
        }
    }

    async deleteRecipe(request, respond) {
        try {
            const db = await connectToDatabase();
            const recipeId = request.params.id;

            const result = await db.collection('recipes').deleteOne({ _id: new ObjectId(recipeId) });

            if (result.deletedCount > 0) {
                respond.json({ message: "Recipe deleted successfully" });
            } else {
                respond.status(404).json({ message: "Recipe not found" });
            }
        } catch (error) {
            console.error("Error deleting recipe:", error);
            respond.status(500).json({ error: "Database deletion error" });
        }
    }
}

module.exports = RecipeDB;