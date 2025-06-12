import { parentPort, workerData } from 'worker_threads';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMP_DIR = path.join(__dirname, 'temp');

async function removeBackground(inputPath: string, outputPath: string): Promise<void> {
    try {
        await fs.access(inputPath);
        console.log(`[Worker Thread] Starting background removal for ${path.basename(inputPath)}`);
        const { stderr } = await execFileAsync("rembg", ["i", inputPath, outputPath]);
        if (stderr) {
            console.warn(`[Worker Thread] Rembg process stderr: ${stderr}`);
        }
        console.log(`[Worker Thread] Background removed. Output: ${outputPath}`);
    } catch (error) {
        console.error("[Worker Thread] Error during background removal:", error);
        throw new Error(`Failed to process image with rembg. Error: ${(error as Error).message}`);
    }
}

async function processImage() {
    if (!parentPort) return;

    const { jobId, image: base64Image } = workerData;
    let inputPath: string | null = null;
    let outputPath: string | null = null;

    try {
        await fs.mkdir(TEMP_DIR, { recursive: true });

        inputPath = path.join(TEMP_DIR, `${jobId}_input.png`);
        outputPath = path.join(TEMP_DIR, `${jobId}_output.png`);

        const imageBuffer = Buffer.from(base64Image.split(',')[1], 'base64');
        await fs.writeFile(inputPath, imageBuffer);

        await removeBackground(inputPath, outputPath);

        const resultBuffer = await fs.readFile(outputPath);
        const resultBase64 = `data:image/png;base64,${resultBuffer.toString('base64')}`;

        parentPort.postMessage({ status: 'completed', image: resultBase64 });

    } catch (error) {
        parentPort.postMessage({ status: 'failed', error: (error as Error).message });
    } finally {
        if (inputPath) await fs.unlink(inputPath).catch(err => console.error(`[Worker Thread] Cleanup failed for ${inputPath}`, err));
        if (outputPath) await fs.unlink(outputPath).catch(err => console.error(`[Worker Thread] Cleanup failed for ${outputPath}`, err));
    }
}

processImage();