import express from "express";
import "reflect-metadata";
import { AppDataSource } from "./data-source";
import { connectRedis } from "./utils/redisClient";
import userRoutes from "./controllers/user.controller";
import authRoutes from "./controllers/auth.controller";
import pngRoutes from "./controllers/png.controller";

/*
cluster module in node.js allows to create child processes(workers) that run copies of server code to make use of multi-core systems, Node.js is single-threaded by defualt, so without clustering, one CPU core handles all the traffic.

Process > One running instance of the app. Think of it as 1 copy
PID > "Process ID" - a unique number of each process
Primary > The main process that manages others 
Worker > The sub process that does actual work (like running the server)
cluster.fork > Make a copy of the app (a worker)
*/
import cluster from "cluster";
import os from "os";

// Calculate the number of CPU cores available
const numCPUs = os.cpus().length;
const PORT = process.env.PORT || 3000;

const startApp = async () => {
    try {
        // Initialize the data source defined in order to use it 
        await AppDataSource.initialize();
        console.log(`Worker ${process.pid}: Database connected`);

        // Connect to Redis on port 6379 running with docker instance
        await connectRedis();
        console.log(`Worker ${process.pid}: Redis connected`);

        const app = express();

        // To parse incoming JSON requests and make the data available under req.body setting the maximum request body size for JSON payloads to 50 megabytes (more than 50 mb will result in 413 payload too large)
        // We do this in order to capture the base64 image format from the user
        app.use(express.json({ limit: "50mb" }));
        /* 
        To parse URL-encoded data (like HTML form submissions) and makes it available under req.body
            - extended: bool value allows for rich objects and arrays to be encoded into the URL-encoded format using the qs library (instead of querstring module)
            - false > only supports flat key-value pairs (key1=value1&key2=value2)
            - true > supports nested objects (user[name]=John&user[age]=30)
        */
        app.use(express.urlencoded({ limit: "50mb", extended: true }));

        // Routes used in the express server
        app.use("/auth", authRoutes);
        app.use("/users", userRoutes);
        app.use("/png", pngRoutes);

        // Test endpoint to check if the server is running or not
        app.get("/", (req, res) => {
            res.send(`Hello world from worker ${process.pid}`);
        });

        // Express app listens on port (3000) for the incoming requests to send corresponding responses
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