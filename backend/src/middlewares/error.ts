import { Request, Response, NextFunction } from "express";
import { HttpStatusCode } from "../utils/types";

interface AppError extends Error {
    statusCode?: number;
}

export const errorHandler = (
    err: AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        message: err.message || "An unexpected error occurred",
    });
};

export const asyncHandler =
    (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
    (req: Request, res: Response, next: NextFunction) =>
        Promise.resolve(fn(req, res, next)).catch(next);

export class HttpError extends Error {
    statusCode: HttpStatusCode;

    constructor(
        message: string,
        statusCode: HttpStatusCode = HttpStatusCode.INTERNAL_SERVER_ERROR
    ) {
        super(message);
        this.statusCode = statusCode;
    }
}
