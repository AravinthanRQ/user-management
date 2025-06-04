import { AnySchema, ValidationError } from "yup";
import { Request, Response, NextFunction } from "express";

export const validate =
    (schema: AnySchema) =>
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            req.body = await schema.validate(req.body, {
                abortEarly: false,
                stripUnknown: true,
            });
            next();
        } catch (e) {
            const validateError = e as ValidationError;
            res.status(400).json({
                errors: validateError.errors,
                message: "API validation failed"
            });
        }
    };
