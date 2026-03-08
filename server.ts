// server.js
import express from "express";
import path from "path";
import { createServer } from "http";

const app = express();
const server = createServer(app);

// Serve frontend build folder
const buildPath = path.join(__dirname, "dist"); // Vite default build folder
app.use(express.static(buildPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});

// PORT setup for Render
const PORT = process.env.PORT ?? 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
