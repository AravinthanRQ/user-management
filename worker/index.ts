import { createClient } from "redis";
import { execFile } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import * as path from "path";
import * as fs from "fs/promises";

const INPUT_QUEUE_NAME = "image-processing-queue";
const RESULT_KEY_PREFIX = "result:";
const TEMP_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "temp");
const RESULT_EXPIRATION_SECONDS = 3600;

const client = createClient();
const execFileAsync = promisify(execFile);

async function removeBackground(
    inputPath: string,
    outputPath: string
): Promise<void> {
    console.log(`[Worker] Starting background removal for ${inputPath}`);
    try {
        await fs.access(inputPath);

        const { stdout, stderr } = await execFileAsync("rembg", ["i", inputPath, outputPath]);

        if (stderr) {
            console.warn(`[Worker] Rembg process stderr: ${stderr}`);
        }

        console.log(`[Worker] Background removed. Output saved to ${outputPath}`);
    } catch (error) {
        console.error("[Worker] Error during background removal:", error);
        throw new Error(`Failed to process image with rembg. Error: ${error.message}`);
    }
}

async function main() {
    await fs.mkdir(TEMP_DIR, { recursive: true });

    await client.connect();
    console.log(`[Worker] Connected to Redis. Listening on queue: "${INPUT_QUEUE_NAME}"`);

    while (true) {
        let jobId: string | null = null;
        let inputPath: string | null = null;
        let outputPath: string | null = null;

        try {
            const payload = await client.brPop(INPUT_QUEUE_NAME, 0);
            if (!payload) continue;

            const { image: base64Image, jobId: receivedJobId } = JSON.parse(payload.element);
            jobId = receivedJobId;
            console.log(`[Worker] Received job ID: ${jobId}`);

            inputPath = path.join(TEMP_DIR, `${jobId}_input.png`);
            outputPath = path.join(TEMP_DIR, `${jobId}_output.png`);

            const imageBuffer = Buffer.from(base64Image.split(',')[1], 'base64');
            await fs.writeFile(inputPath, imageBuffer);
            console.log(`[Worker] Saved input image to ${inputPath}`);

            await removeBackground(inputPath, outputPath);

            const resultBuffer = await fs.readFile(outputPath);
            const resultBase64 = `data:image/png;base64,${resultBuffer.toString('base64')}`;

            const resultKey = `${RESULT_KEY_PREFIX}${jobId}`;
            const resultPayload = JSON.stringify({ status: 'completed', image: resultBase64 });
            await client.set(resultKey, resultPayload, { EX: RESULT_EXPIRATION_SECONDS });
            console.log(`[Worker] Job ${jobId} completed successfully. Result stored in Redis.`);

        } catch (error) {
            console.error(`[Worker] Failed to process job ${jobId}:`, error);
            if (jobId) {
                const resultKey = `${RESULT_KEY_PREFIX}${jobId}`;
                const errorPayload = JSON.stringify({ status: 'failed', error: error.message });
                await client.set(resultKey, errorPayload, { EX: RESULT_EXPIRATION_SECONDS });
            }
        } finally {
            if (inputPath) await fs.unlink(inputPath).catch(err => console.error(`[Worker] Cleanup failed for ${inputPath}`, err));
            if (outputPath) await fs.unlink(outputPath).catch(err => console.error(`[Worker] Cleanup failed for ${outputPath}`, err));
        }
    }
}

main().catch(err => {
    console.error("A critical error occurred in the worker:", err);
    process.exit(1);
});