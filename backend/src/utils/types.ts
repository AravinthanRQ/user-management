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

export enum HttpStatusCode {
    OK = 200,
    CREATED = 201,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    CONFLICT = 409,
    INTERNAL_SERVER_ERROR = 500,
}
