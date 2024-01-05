// Importing necessary modules and configuration
import express from "express";
import pg from "pg";
import "dotenv/config";

// Retrieving database credentials from environment variables
const PG_PASSWORD = process.env.PG_PASSWORD;
const PG_PORT = process.env.PG_PORT;

// Initializing Express application
const app = express();
const port = process.env.PORT || 3005;  // Using environment variable or default port

// Setting up PostgreSQL database client with configuration details
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: PG_PASSWORD,
  port: PG_PORT,
});
// Connecting to the database
db.connect().catch((err) =>
  console.error("PG Database connection error", err.stack)
);

// Middleware for parsing URL-encoded data and serving static files
app.use(express.urlencoded({ extended: true })); 
app.use(express.static("public")); 

// Variable to keep track of the current user's ID
let currentUserId = 1;

// Function to get visited countries for a user
 const visitedCountries = async (userID) => {
  const result = await db.query(
    "SELECT country_code FROM visited_countries WHERE user_id = $1",
    [userID]
  );
   return result.rows.map(row => row.country_code);
}

//  functions to get user details
const users = async (userID) => {
  const result = await db.query("SELECT * FROM users WHERE id = $1", [userID]);
  return result.rows;
};
const userMembers = async () => {
  const result = await db.query("SELECT * FROM users ORDER BY name ASC");
  return result.rows;
}

// GET/
// Main route to display user info and visited countries
app.get("/", async (req, res) => {
  try {
   const user = await users(currentUserId);
   const countries = await visitedCountries(currentUserId);
    res.render("index.ejs", {
      countries:  countries,
      users: await userMembers(),
      color: user[0]?.color, 
      total:  countries.length,
    });
  } catch (error) {
     console.error("Error in GET /:", error);
     res.status(500).send("Internal Server Error");
  };
});

// Route to display all countries
app.get("/countries", async (req, res) => {
  const result = await db.query("SELECT * FROM countries");
  res.render("countries.ejs", {
    countries: result.rows,
  });
});

// POST/
// Route to add a visited country
app.post("/add", async (req, res) => {
  const country = req.body["country"].trim();
  const result = await db.query(
    "SELECT country_code FROM countries_code WHERE LOWER(country_name) = $1",
    [country.toLowerCase()]
  );
   const user = await users(currentUserId);
   const countries = await visitedCountries(currentUserId);
  try {
    await db.query(
      "INSERT INTO visited_countries (country_code, user_id) VALUES($1,$2)",
      [result.rows[0].country_code, currentUserId]
    );
    res.redirect("/");
  } catch (error) {
    
    res.render("index.ejs", {
      countries: countries,
      users: await userMembers(),
      color: user[0].color,
      total: countries.length,
      error: `You Already Chose ${country} As Your Visited Country`,
    });
  }
});

// Route to handle user selection
app.post("/user", (req, res) => {
  const userId = req.body.user;

  if (userId != undefined) {
    currentUserId = userId;

    res.redirect("/");
  } else if (userId == "Button") {
    res.render("countries.ejs");
  } else {
    res.render("new.ejs");
  }
});

// Route to add a new user
app.post("/new", async (req, res) => {
  const newUser = req.body.name;
  const userColor = req.body.color;
  try {
    const result = await db.query(
      "INSERT INTO users (name, color) VALUES(INITCAP($1),$2) RETURNING id",
      [newUser, userColor]
    );
    currentUserId = result.rows[0].id;
    res.redirect("/");
  } catch (error) {
    if (!userColor || !newUser) {
      res.render("new.ejs", {
        error: "Enter Your Name And Pick A Color",
      });
    
    } else {
      res.render("new.ejs", {
        error: "Name already exist. please chose something else",
      });
    }
  }
});



app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
