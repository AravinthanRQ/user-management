import express from "express";
import "reflect-metadata";
import { AppDataSource } from "./data-source";
import { connectRedis } from "./utils/redisClient";
import userRoutes from "./controllers/user.controller";
import authRoutes from "./controllers/auth.controller";
import pngRoutes from "./controllers/png.controller";

import cluster from "cluster";
import os from "os";

const numCPUs = os.cpus().length;
const PORT = process.env.PORT || 3000;

const startApp = async () => {
    try {
        await AppDataSource.initialize();
        console.log(`Worker ${process.pid}: Database connected`);

        await connectRedis();
        console.log(`Worker ${process.pid}: Redis connected`);

        const app = express();

        app.use(express.json({ limit: "50mb" }));
        app.use(express.urlencoded({ limit: "50mb", extended: true }));

        app.use("/auth", authRoutes);
        app.use("/users", userRoutes);
        app.use("/png", pngRoutes);

        app.get("/", (req, res) => {
            res.send(`Hello world from worker ${process.pid}`);
        });

        app.listen(PORT, () =>
            console.log(`Worker ${process.pid} started. Server running on port ${PORT}`)
        );
    } catch (err) {
        console.error(`Worker ${process.pid} failed to initialize:`, err);
        process.exit(1);
    }
};

if (cluster.isPrimary) {
    console.log(`Primary ${process.pid} is running`);
    console.log(`Forking for ${numCPUs} CPUs`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on("exit", (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Forking another one...`);
        cluster.fork();
    });
} else {
    startApp();
}