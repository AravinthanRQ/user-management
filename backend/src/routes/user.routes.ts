import { Request, Response, Router } from "express";
import { userRepository } from "../data-source";
import { authMiddleware } from "../middlewares/auth";
import { validate } from "../middlewares/validation";
import { userRequest, userSchema } from "../types";
import bcrypt from "bcrypt";
import { classToPlain } from "class-transformer";
import { User } from "../entity/User";

const router = Router();

router.get("/", authMiddleware, async (_, res: Response) => {
    try {
        const users = await userRepository.find();
        res.status(200).json({
            message: "Users retrieved successfully",
            data: users.map(user => classToPlain(user)),
        });
    } catch (e) {
        res.status(500).json({
            message: "Internal server error retrieving users",
            error: (e as Error).message
        });
    }
});

router.get("/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id);

        if (isNaN(userId)) {
            res.status(400).json({
                message: "Invalid user ID",
            });
            return;
        }

        const user = await userRepository.findOneBy({ id: userId });
        if (!user) {
            res.status(404).json({
                message: "User not found.",
            });
            return;
        }
        res.status(200).json({
            message: "User retrieved successfully",
            data: classToPlain(Object.assign(new User(), user)),

        });
    } catch (e) {
        res.status(500).json({
            message: "Internal server error retrieving user",
            error: (e as Error).message
        });
    }
});

router.put(
    "/:id",
    authMiddleware,
    validate(userSchema),
    async (req: userRequest, res: Response) => {
        try {
            const userId = parseInt(req.params.id);
            const reqUserId = req.user?.id;

            if (isNaN(userId)) {
                res.status(400).json({
                    message: "Invalid user ID",
                });
                return;
            }

            if (userId !== Number(reqUserId)) {
                res.status(403).json({
                    message: "Unauthorized to update this user",
                });
                return;
            }

            const { email, password } = req.body;
            const SALTROUNDS = Number(process.env.SALT_ROUNDS);
            if (!SALTROUNDS) {
                res.status(500).json({
                    message: "Salt rounds not configured in .env",
                });
                return;
            }

            let userToUpdate = await userRepository.findOneBy({ id: userId });

            if (!userToUpdate) {
                res.status(404).json({
                    message: "User not found to update.",
                });
                return;
            }

            const hashedPassword = await bcrypt.hash(password, SALTROUNDS);

            userToUpdate.email = email;
            userToUpdate.password = hashedPassword;
            
            const updatedUser = await userRepository.save(userToUpdate);

            res.status(200).json({
                message: "User updated successfully",
                data: classToPlain(updatedUser),
            });
        } catch (e) {
            if ((e as any).code === '23505') {
                 res.status(400).json({
                    message: "Email already in use by another account.",
                    error: (e as Error).message
                });
                return;
            }
            res.status(500).json({
                message: "Internal server error updating user",
                error: (e as Error).message
            });
        }
    }
);

router.delete("/:id", authMiddleware, async (req: userRequest, res: Response) => {
    try {
        const userId = parseInt(req.params.id);
        const reqUserId = req.user?.id;

        if (isNaN(userId)) {
            res.status(400).json({
                message: "Invalid user ID",
            });
            return;
        }

        if (userId !== Number(reqUserId)) {
            res.status(403).json({
                message: "Unauthorized to delete this user",
            });
            return;
        }

        const user = await userRepository.findOneBy({ id: userId });
        if (!user) {
            res.status(404).json({
                message: "User not found to delete.",
            });
            return;
        }
        const deleteResult = await userRepository.delete(userId);
        if (deleteResult.affected === 0) {
             res.status(404).json({
                message: "User not found or already deleted.",
            });
            return;
        }
        res.status(200).json({
            message: "User deleted successfully",
        });
    } catch (e) {
        res.status(500).json({
            message: "Internal server error deleting user",
            error: (e as Error).message
        });
    }
});

export default router;