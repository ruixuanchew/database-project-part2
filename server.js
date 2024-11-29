const express = require('express');
const path = require('path');
const connection = require('./js/db'); // Import the db connection
const routeRecipe = require('./routes/routeRecipe');
const routePlanner = require('./routes/routePlanner');
const routeUser = require('./routes/routeUser');
const routeNutrition = require('./routes/routeNutrition');
const RecipeDB = require('./models/recipeDB'); // Import RecipeDB for index management

const app = express();
const port = 3000;
const startPage = "recipes.html";

// Session for login
const session = require('express-session');

app.use(session({
    secret: 'your_secret_key', // Use a strong secret key for production
    resave: false,             // Don't save session if it hasn't been modified
    saveUninitialized: false,  // Don't create session until something stored
    cookie: { secure: false }  // Set true if using HTTPS; set false for HTTP
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());

// Route to serve the start page at the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', startPage));
});

// Define routes
routeRecipe.routeRecipe(app);
routePlanner.routePlanner(app);
routeUser.routeUser(app);
routeNutrition.routeNutrition(app);

function gotoIndex(req, res) {
    res.sendFile(__dirname + "/" + startPage);
}

app.get("/" + startPage, gotoIndex);

// Initialize the application
async function initializeApp() {
    try {
        // Ensure indexes are created for RecipeDB
        const recipeDB = new RecipeDB();
        await recipeDB.ensureIndexes(); // Call the ensureIndexes function

        console.log("Indexes ensured successfully.");

        // Start the server only after initialization
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
    } catch (error) {
        console.error("Failed to initialize app:", error);
        process.exit(1); // Exit the process if initialization fails
    }
}

// Call the initialization function
initializeApp();