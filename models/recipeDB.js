"use strict";

const connectToDatabase = require('../js/db');
const { ObjectId } = require('mongodb');
const Recipe = require('./recipe');

class RecipeDB {
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
            const page = parseInt(request.query.page) || 1;
            const limit = parseInt(request.query.limit) || 20;
            const offset = (page - 1) * limit;

            const query = {};

            // Apply search query filtering
            if (searchQuery) {
                query.$or = [
                    { name: { $regex: searchQuery, $options: 'i' } },
                    { search_terms: { $regex: searchQuery, $options: 'i' } }
                ];
            }

            // Apply additional filters
            if (filters.length) {
                query.$and = filters.map(filter => ({
                    search_terms: { $regex: filter, $options: 'i' }
                }));
            }

            console.log("Constructed MongoDB Query:", JSON.stringify(query, null, 2));

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

            // // Add pagination stages
            // pipeline.push({ $skip: offset });
            // pipeline.push({ $limit: limit });

            console.log("Executing MongoDB Pipeline:", JSON.stringify(pipeline, null, 2));

            // Execute the aggregation pipeline
            const recipes = await db.collection('recipes').aggregate(pipeline).toArray();

            console.log("Search Query:", searchQuery);
            console.log("Filters Applied:", filters);
            console.log("Sort By:", sortBy, "Sort Direction:", sortDirection);
            console.log("Fetched recipes count:", recipes.length);

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
            const page = parseInt(request.query.page) || 1;
            const limit = parseInt(request.params.limit) || 20;
            const offset = (page - 1) * limit;

            const query = {};

            if (searchQuery) {
                query.$or = [
                    { name: { $regex: searchQuery, $options: 'i' } },
                    { search_terms: { $regex: searchQuery, $options: 'i' } }
                ];
            }

            if (filters.length) {
                query.$and = filters.map(filter => ({
                    search_terms: { $regex: filter, $options: 'i' }
                }));
            }

            console.log("Constructed MongoDB Query:", JSON.stringify(query, null, 2));

            // Build the aggregation pipeline
            const pipeline = [
                { $match: query }, // First, filter the recipes based on the search query
            ];

            // Add sorting logic
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

            console.log("Executing MongoDB Pipeline:", JSON.stringify(pipeline, null, 2));

            // Execute the aggregation pipeline
            const recipes = await db.collection('recipes').aggregate(pipeline).toArray();

            console.log("Search Query:", searchQuery);
            console.log("Filters Applied:", filters);
            console.log("Sort By:", sortBy, "Sort Direction:", sortDirection);
            console.log("Query Object:", JSON.stringify(query, null, 2));
            console.log("Fetched recipes count:", recipes.length);

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
        }finally {
            session.endSession();
        }
    }

    async updateRecipe(request, respond) {
        const db = await connectToDatabase();
        const session = db.client.startSession();
        try {
            session.startTransaction();
            const recipeId = request.params.id;

            const objectId = new ObjectId(recipeId); 
            
            const recipeObject = new Recipe(
                objectId,
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

            const result = await db.collection('recipes').updateOne(
                { _id: objectId},
                {
                    $set: {
                        name: recipeObject.getName(),
                        description: recipeObject.getDescription(),
                        ingredients: recipeObject.getIngredients(),
                        ingredients_raw: recipeObject.getIngredientsRaw(),
                        serving_size: recipeObject.getServingSize(),
                        servings: recipeObject.getServings(),
                        steps: recipeObject.getSteps(),
                        tags: recipeObject.getTags(),
                        search_terms: recipeObject.getSearchTerms()
                    }
                }
            );
            respond.json(result);
            await session.commitTransaction();
        } catch (error) {
            console.error("Database update error:", error);
            respond.status(500).json({ error: "Database update error" });
            await session.abortTransaction();
        }finally {
            session.endSession();
        }
    }

    async deleteRecipe(request, respond) {
        const db = await connectToDatabase();
        const session = db.client.startSession();
        try {
            const recipeId = request.params.id;
            const objectId = new ObjectId(recipeId);
            session.startTransaction(); 
            
            const result = await db.collection('recipes').deleteOne({ _id: objectId });
            respond.json(result);
            await session.commitTransaction();
        } catch (error) {
            console.error("Database deletion error:", error);
            respond.status(500).json({ error: "Database deletion error" });
            await session.abortTransaction();
        }finally {
            session.endSession();
        }
    }
}

module.exports = RecipeDB;