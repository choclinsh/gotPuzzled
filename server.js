const express = require('express');
const logger = require('./middleware/logger');
const userRoutes=require("./routes/users")
const scoresRoutes=require("./routes/scores")


// Initialize the app
const app = express();
const PORT = 3000;

app.use(express.json());  // allows server to read JSON bodies
app.use(logger);
app.use("/users",userRoutes)
app.use("/scores",scoresRoutes)

// Home screen, just greetings message
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {"message": "My Interactive Puzzle API is running!"},
    error: null
  });
});

// 404 Route Not Found Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    data: null,
    error: {
      code: "ENDPOINT_NOT_FOUND",
      message: `The requested URL '${req.originalUrl}' does not exist on this server.`,
      details: {}
    }
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack); // Log the error to the console

  res.status(500).json({
    success: false,
    data: null,
    error: {
      code: "SERVER_ERROR",
      message: "An unexpected error occurred on the server.",
      details: {}
    }
  });
});

// Start the Server
app.listen(PORT, () => {
  console.log(`Server is successfully running on http://localhost:${PORT}`);
});