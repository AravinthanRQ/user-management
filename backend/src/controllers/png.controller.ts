import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import redisClient from "../utils/redisClient";

const INPUT_QUEUE_NAME = "image-processing-queue";
const RESULT_KEY_PREFIX = "result:";

const router = Router();

router.post("/submit", async (req: any, res: any) => {
    const { image } = req.body;

    if (!image) {
        return res.status(400).json({ msg: "Image data is required." });
    }

    try {
        const jobId = uuidv4();
        const jobPayload = JSON.stringify({
            jobId,
            image,
        });

        await redisClient.lPush(INPUT_QUEUE_NAME, jobPayload);
        console.log(`Submitted job ID: ${jobId}`);

        res.status(202).json({
            msg: "Your image has been submitted for processing. Check the result endpoint with the provided jobId.",
            jobId: jobId,
        });
    } catch (e) {
        console.error("Failed to submit job:", e);
        res.status(500).json({
            msg: "Submission failed due to an internal server error.",
        });
    }
});

router.get("/result/:jobId", async (req, res) => {
    const { jobId } = req.params;
    const resultKey = `${RESULT_KEY_PREFIX}${jobId}`;

    try {
        const result = await redisClient.get(resultKey);

        if (result) {
            res.status(200).json(JSON.parse(result));
        } else {
            res.status(202).json({
                status: "pending",
                msg: "Your job is still in the queue or being processed."
            });
        }
    } catch (e) {
        console.error(`Failed to retrieve result for job ${jobId}:`, e);
        res.status(500).json({
            msg: "Failed to retrieve result due to an internal server error.",
        });
    }
});

export default router;