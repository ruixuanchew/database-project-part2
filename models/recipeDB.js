"use strict";

const connectToDatabase = require('../js/db');
const { ObjectId } = require('mongodb'); 
const Recipe = require('./recipe');

class RecipeDB {

    async getAllRecipes(request, respond) {
        try {
            const db = await connectToDatabase();
            const recipes = await db.collection('recipes').find({}).toArray();
            respond.json(recipes);
        } catch (error) {
            respond.status(500).json({ error: "Database query error" });
        }
    }

    async getSortedRecipes(request, respond) {
        try {
            const db = await connectToDatabase();
            const page = parseInt(request.params.page) || 1;
            const limit = parseInt(request.params.limit) || 20;
            const offset = (page - 1) * limit;
            const searchQuery = request.query.query ? request.query.query.toLowerCase() : '';
            const sortBy = request.query.sortBy || 'recipe_id';
            const sortDirection = request.query.sortDirection === 'DESC' ? -1 : 1;
            const filters = request.query.filters ? request.query.filters.split(',').map(f => f.toLowerCase()) : [];

            // Build query object
            const query = {};
            if (searchQuery) {
                query.$or = [
                    { name: { $regex: searchQuery, $options: 'i' } },
                    { search_terms: { $regex: searchQuery, $options: 'i' } }
                ];
            }
            if (filters.length) {
                query.search_terms = { $all: filters };
            }

            const recipes = await db.collection('recipes')
                .find(query)
                .sort({ [sortBy]: sortDirection })
                .skip(offset)
                .limit(limit)
                .toArray();
            respond.json(recipes);
        } catch (error) {
            respond.status(500).json({ error: "Database query error" });
        }
    }

    async getRecipeIdAndName(request, respond) {
        try {
            const db = await connectToDatabase();
            const recipes = await db.collection('recipes').find({}, { projection: { recipe_id: 1, name: 1 } }).toArray();
            respond.json(recipes);
        } catch (error) {
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
            const limit = 20;
            const offset = (page - 1) * limit;

            const query = {};
            if (searchQuery) {
                query.$or = [
                    { name: { $regex: searchQuery, $options: 'i' } },
                    { search_terms: { $regex: searchQuery, $options: 'i' } }
                ];
            }
            if (filters.length) {
                query.search_terms = { $all: filters };
            }

            const recipes = await db.collection('recipes')
                .find(query)
                .sort({ [sortBy]: sortDirection })
                .skip(offset)
                .limit(limit)
                .toArray();
            respond.json(recipes);
        } catch (error) {
            respond.status(500).json({ error: "Database query error" });
        }
    }

    async getRecipeById(request, respond) {
        try {
            const db = await connectToDatabase();
    
            const recipeId = request.params.id;

            // Convert the recipeId to an ObjectId
            const objectId = new ObjectId(recipeId);
    
            // Fetch the recipe
            const recipe = await db.collection('recipes').findOne({ _id: objectId }); 
            if (recipe) {
                respond.json(recipe);
            } else {
                respond.status(404).json({ message: 'Recipe not found' });
            }
        } catch (error) {
            console.error("Database query error:", error); 
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
        } catch (error) {
            respond.status(500).json({ error: "Database insertion error" });
        }
    }

    async updateRecipe(request, respond) {
        try {
            const db = await connectToDatabase();
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
        } catch (error) {
            console.error("Database update error:", error);
            respond.status(500).json({ error: "Database update error" });
        }
    }

    async deleteRecipe(request, respond) {
        try {
            const db = await connectToDatabase();
            const recipeId = request.params.id;
            const objectId = new ObjectId(recipeId); 
            
            const result = await db.collection('recipes').deleteOne({ _id: objectId });
            respond.json(result);
        } catch (error) {
            console.error("Database deletion error:", error);
            respond.status(500).json({ error: "Database deletion error" });
        }
    }
}

module.exports = RecipeDB;
