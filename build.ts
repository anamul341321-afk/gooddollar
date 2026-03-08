// build.ts
import path from "path";
import { execSync } from "child_process";
import express from "express";

// -----------------------
// ১️⃣ Build Frontend (React + Vite)
// -----------------------
try {
  console.log("Installing dependencies...");
  execSync("npm install", { stdio: "inherit" });

  console.log("Building frontend...");
  execSync("npm run build", { stdio: "inherit" });

  console.log("Frontend build complete ✅");
} catch (err) {
  console.error("Build failed ❌", err);
  process.exit(1);
}

// -----------------------
// ২️⃣ Serve React build folder via Express
// -----------------------
const app = express();
const PORT = process.env.PORT || 3000;

const buildPath = path.join(__dirname, "dist"); // Vite default output folder = dist
app.use(express.static(buildPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
