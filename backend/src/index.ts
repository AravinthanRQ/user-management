import express from "express";
import "reflect-metadata";
import { AppDataSource } from "./data-source";
import userRoutes from "./routes/user.routes";
import authRoutes from "./routes/auth.routes"

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/auth", authRoutes);
app.use("/users", userRoutes);

app.get("/", (req, res) => {
    res.send("Hello world");
});

AppDataSource.initialize()
    .then(() => {
        console.log("Database connected");
        app.listen(3000, () => console.log("Server running on port 3000"));
    })
    .catch((err) => {
        console.error("Error during Data Source initialization", err);
    });
