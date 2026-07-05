import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.static("public"));

// fix dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

// static files
app.use(express.static(path.join(__dirname, "public")));

// home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// start
app.listen(3000, () => {
  console.log("SERVER OK: http://localhost:3000");
});
