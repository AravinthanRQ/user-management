import { Router, Request, Response } from "express";
import { userRepository } from "../data-source";
import { validate } from "../middlewares/validation";
import { HttpStatusCode, userSchema } from "../utils/types";
import bcrypt from "bcrypt";
import { generateToken } from "../utils/jwt";
import { instanceToPlain } from "class-transformer";
import { User } from "../entity/User";
import { HttpError, asyncHandler } from "../middlewares/error";

const router = Router();

router.post(
    "/register",
    validate(userSchema),
    asyncHandler(async (req: Request, res: Response) => {
        const { email, password } = req.body;
        const SALTROUNDS = Number(process.env.SALT_ROUNDS);
        if (!SALTROUNDS) throw new HttpError("Salt not found in environment file", HttpStatusCode.INTERNAL_SERVER_ERROR)
        const hashedPassword = await bcrypt.hash(password, SALTROUNDS);

        const userExists = await userRepository.findOne({
            where: { email },
        });

        if (userExists) throw new HttpError("User already exists", HttpStatusCode.BAD_REQUEST);

        const userToSave = new User();
        userToSave.email = email;
        userToSave.password = hashedPassword;

        const newUser = await userRepository.save(userToSave);

        const token = generateToken({
            id: String(newUser.id),
            email: newUser.email,
        });

        res.status(200).json({
            message: "New user created successfully",
            data: {
                user: instanceToPlain(Object.assign(new User(), newUser)),
                token,
            },
        });
    })
);

router.post(
    "/login",
    validate(userSchema),
    asyncHandler(async (req: Request, res: Response) => {
        const { email, password } = req.body;
        
        const userExists = await userRepository.findOne({
            where: { email },
        });

        if (!userExists) throw new HttpError("User doesn't exist", HttpStatusCode.BAD_REQUEST);

        const passwordCheck = await bcrypt.compare(
            password,
            userExists.password
        );

        if (!passwordCheck) throw new HttpError("Unauthorized credentials", HttpStatusCode.FORBIDDEN);

        const token = generateToken({
            id: String(userExists.id),
            email,
        });

        res.status(200).json({
            message: "Login Successful!",
            data: { token },
        });
    })
);

export default router;