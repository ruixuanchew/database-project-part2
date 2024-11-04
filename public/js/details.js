// Function to get the recipe ID from the URL
function getRecipeIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Function to dynamically display recipe details
function displayRecipeDetails() {
    const recipeId = getRecipeIdFromUrl();
    let TotalCal = 0;
    let TotalProtein = 0;
    let TotalFat = 0;
    let TotalCarbs = 0;
    
    if (!recipeId) {
        console.error('No recipe ID found in the URL');
        return;
    }

    // Fetch the recipe details from your server using the recipe ID
    fetch(`/recipes/${recipeId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Recipe not found');
            }
            return response.json();
        })
        .then(recipe => {
            // Fetch nutrition value for each ingredient in the recipe
            fetch(`/nutritions/${recipeId}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Nutritional data for ${recipeId} not found`);
                    }
                    return response.json();
                })
                .then(nutrition => {
                    for (let i = 0; i < nutrition.length; i++) {
                        const nutrient = nutrition[i].nutrition;

                        const calories = Number(nutrient.calories);
                        if (!isNaN(calories) && isFinite(calories)) {
                            TotalCal += calories;
                        }
                        const carbs = Number(nutrient.carbs);
                        if (!isNaN(carbs) && isFinite(carbs)) {
                            TotalCarbs += carbs;
                        }
                        const fat = Number(nutrient.fat);
                        if (!isNaN(fat) && isFinite(fat)) {
                            TotalFat += fat;
                        }
                        const protein = Number(nutrient.protein);
                        if (!isNaN(protein) && isFinite(protein)) {
                            TotalProtein += protein;
                        }
                    }
                    const nutritionTable = document.getElementById('recipeNutrition');
                    nutritionTable.innerHTML = `
                        <tr><td>Calories</td><td>${TotalCal} kcal</td></tr>
                        <tr><td>Protein</td><td>${TotalProtein} g</td></tr>
                        <tr><td>Fat</td><td>${TotalFat} g</td></tr>
                        <tr><td>Carbs</td><td>${TotalCarbs} g</td></tr>
                    `;
                })
                .catch(error => {
                    console.error(`Error fetching nutrition data for ${recipeId}:`, error);
                });

            const recipeTitle = document.getElementById('recipe-title');
            recipeTitle.textContent = recipe.name;

            // Populate the Ingredients section
            const ingredientsList = document.getElementById('recipeIngredients');
            ingredientsList.innerHTML = '';
            recipe.ingredients_raw.split(',').forEach(ingredient => {
                const li = document.createElement('li');
                li.className = 'list-group-item';
                li.textContent = ingredient;
                ingredientsList.appendChild(li);
            });

            // Populate the Steps section
            const stepsList = document.getElementById('recipeSteps');
            stepsList.innerHTML = '';
            recipe.steps.split('\n').forEach(step => {
                const li = document.createElement('li');
                li.className = 'list-group-item';
                li.textContent = step;
                stepsList.appendChild(li);
            });
        })
        .catch(error => console.error('Error fetching recipe details:', error));
}

// Call the function when the page loads
document.addEventListener('DOMContentLoaded', displayRecipeDetails);
