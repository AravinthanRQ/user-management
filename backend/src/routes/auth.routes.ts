import { Router, Request, Response } from "express";
import { userRepository } from "../data-source";
import { validate } from "../middlewares/validation";
import { userSchema } from "../types";
import bcrypt from "bcrypt";
import { generateToken } from "../utils";
import { classToPlain } from "class-transformer";
import { User } from "../entity/User";

const router = Router();

router.post(
    "/register",
    validate(userSchema),
    async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body;
            const SALTROUNDS = Number(process.env.SALT_ROUNDS);
            if (!SALTROUNDS) {
                res.status(400).json({
                    message: "Salt not found in .env",
                });
                return;
            }
            const hashedPassword = await bcrypt.hash(password, SALTROUNDS);

            const userExists = await userRepository.findOne({
                where: { email },
            });

            if (userExists) {
                res.status(400).json({
                    message: "User already exists",
                });
                return;
            }

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
                    user: classToPlain(Object.assign(new User(), newUser)),
                    token,
                },
            });
        } catch (e) {
            res.status(500).json({
                message: "Error registering new user",
                errors: (e as any).message,
            });
        }
    }
);

router.post(
    "/login",
    validate(userSchema),
    async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body;
            const SALTROUNDS = Number(process.env.SALT_ROUNDS);
            if (!SALTROUNDS) {
                res.status(400).json({
                    message:
                        "Salt not found in .env (though not directly used for login comparison)",
                });
                return;
            }

            const userExists = await userRepository.findOne({
                where: { email },
            });

            if (!userExists) {
                res.status(400).json({
                    message: "User doesn't exist",
                });
                return;
            }

            const passwordCheck = await bcrypt.compare(
                password,
                userExists.password
            );

            if (!passwordCheck) {
                res.status(403).json({
                    message: "Unauthorized credentials",
                });
                return;
            }

            const token = generateToken({
                id: String(userExists.id),
                email,
            });

            res.status(200).json({
                message: "Login Successful!",
                data: { token },
            });
        } catch (e) {
            res.status(500).json({
                message: "Error during login process",
                errors: (e as any).message,
            });
        }
    }
);

export default router;
