import * as yup from "yup";
import { Request } from "express";

export const userSchema = yup.object({
    email: yup.string().email().required(),
    password: yup.string().required(),
});

export type userType = yup.InferType<typeof userSchema>;

export interface JwtPayload {
    id: string;
}

export interface userRequest extends Request {
    user?: JwtPayload;
}
