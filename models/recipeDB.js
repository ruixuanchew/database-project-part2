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

            const pipeline = [];

            // Match stage for filters and search (if applicable)
            if (Object.keys(query).length > 0) {
                pipeline.push({ $match: query });
            }

            // Add a derived field 'serving_mass' from the 'serving_size' field (assuming format "1 (155 g)")
            pipeline.push({
                $addFields: {
                    serving_mass: {
                        $cond: {
                            if: {
                                $regexMatch: {
                                    input: "$serving_size",
                                    regex: "^\\d+\\s*\\(\\d+\\s*g\\)$" // Ensure format like "1 (155 g)"
                                }
                            },
                            then: {
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
                            },
                            else: null
                        }
                    }
                }
            });

            // Sort based on serving_mass or another field (if `sortBy` is 'serving_size')
            if (sortBy === 'serving_size') {
                pipeline.push({
                    $sort: {
                        serving_mass: sortDirection === 'ASC' ? 1 : -1, // Ascending or descending sort based on serving_mass
                        _id: 1 // Tie-breaker for consistent sorting (optional)
                    }
                });
            } else {
                pipeline.push({
                    $sort: {
                        [sortBy]: sortDirection === 'ASC' ? 1 : -1, // Sort by any other field specified in `sortBy`
                        _id: 1 // Tie-breaker for consistent sorting
                    }
                });
            }

            // // Pagination stages
            // pipeline.push({ $skip: offset });
            // pipeline.push({ $limit: limit });

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

            const pipeline = [];

            // Match stage for filters and search (if applicable)
            if (query) {
                pipeline.push({ $match: query });
            }

            // Sort based on serving_mass or other fields
            if (sortBy === 'serving_size') {
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
                pipeline.push({ $sort: { serving_mass: sortDirection } });
            } else {
                pipeline.push({ $sort: { [sortBy]: sortDirection } });
            }

            // // Pagination stages
            // pipeline.push({ $skip: offset });
            // pipeline.push({ $limit: limit });

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
        try {
            const db = await connectToDatabase();
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

            console.log("Adding new recipe:", recipeObject);

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

            console.log("Recipe added with ID:", result.insertedId);
            respond.json(result);
        } catch (error) {
            console.error("Error adding recipe:", error);
            respond.status(500).json({ error: "Database insertion error" });
        }
    }

    async updateRecipe(request, respond) {
        try {
            const db = await connectToDatabase();
            const recipeId = request.params.id;

            console.log("Updating recipe with ID:", recipeId);

            const recipeObject = new Recipe(
                recipeId,
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
                { _id: new ObjectId(recipeId) },
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

            console.log("Recipe update result:", result);
            respond.json(result);
        } catch (error) {
            console.error("Error updating recipe:", error);
            respond.status(500).json({ error: "Database update error" });
        }
    }

    async deleteRecipe(request, respond) {
        try {
            const db = await connectToDatabase();
            const recipeId = request.params.id;

            console.log("Deleting recipe with ID:", recipeId);

            const result = await db.collection('recipes').deleteOne({ _id: new ObjectId(recipeId) });

            console.log("Recipe deletion result:", result);
            respond.json(result);
        } catch (error) {
            console.error("Error deleting recipe:", error);
            respond.status(500).json({ error: "Database deletion error" });
        }
    }
}

module.exports = RecipeDB;
