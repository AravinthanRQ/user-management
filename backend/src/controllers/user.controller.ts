import { Response, Router } from "express";
import { userRepository } from "../data-source";
import { authMiddleware } from "../middlewares/auth";
import { validate } from "../middlewares/validation";
import { HttpStatusCode, userRequest, userSchema } from "../utils/types";
import bcrypt from "bcrypt";
import { instanceToPlain } from "class-transformer";
import { User } from "../entity/User";
import { HttpError, asyncHandler } from "../middlewares/error";
import redisClient from "../utils/redisClient";

const router = Router();

const USER_CACHE_PREFIX = "user:";
const CACHE_TTL_SECONDS = 3600;

router.get(
    "/",
    authMiddleware,
    asyncHandler(async (_, res: Response) => {
        const users = await userRepository.find();
        res.status(200).json({
            message: "Users retrieved successfully",
            data: users.map((user) => instanceToPlain(user)),
        });
    })
);

router.get(
    "/:id",
    authMiddleware,
    asyncHandler(async (req: userRequest, res: Response) => {
        const userId = parseInt(req.params.id);
        const cacheKey = `${USER_CACHE_PREFIX}${userId}`;

        if (isNaN(userId))
            throw new HttpError(
                "Invalid user ID",
                HttpStatusCode.BAD_REQUEST
            );

        if (Number(userId) !== Number(req.user?.id)) {
            throw new HttpError(
                "Unauthorized to retrieve this user",
                HttpStatusCode.FORBIDDEN
            );
        }

        const cachedUser = await redisClient.get(cacheKey);
        if (cachedUser) {
            return res.status(200).json({
                message: "User retrieved successfully (from cache)",
                data: JSON.parse(cachedUser),
            });
        }

        const user = await userRepository.findOneBy({ id: userId });
        if (!user)
            throw new HttpError(
                "User not found.",
                HttpStatusCode.NOT_FOUND
            );

        const plainUser = instanceToPlain(Object.assign(new User(), user));

        await redisClient.set(cacheKey, JSON.stringify(plainUser), {
            EX: CACHE_TTL_SECONDS,
        });

        res.status(200).json({
            message: "User retrieved successfully",
            data: plainUser,
        });
    })
);

router.put(
    "/:id",
    authMiddleware,
    validate(userSchema),
    asyncHandler(async (req: userRequest, res: Response) => {
        const userId = parseInt(req.params.id);
        const cacheKey = `${USER_CACHE_PREFIX}${userId}`;
        const reqUserId = req.user?.id;

        if (isNaN(userId))
            throw new HttpError(
                "Invalid user ID",
                HttpStatusCode.BAD_REQUEST
            );

        if (userId !== Number(reqUserId))
            throw new HttpError(
                "Unauthorized to update this user",
                HttpStatusCode.FORBIDDEN
            );

        const { email, password } = req.body;
        const SALTROUNDS = Number(process.env.SALT_ROUNDS);
        if (!SALTROUNDS)
            throw new HttpError(
                "Salt rounds not configured in .env",
                HttpStatusCode.INTERNAL_SERVER_ERROR
            );

        let userToUpdate = await userRepository.findOneBy({ id: userId });

        if (!userToUpdate)
            throw new HttpError(
                "User not found to update.",
                HttpStatusCode.NOT_FOUND
            );

        const hashedPassword = await bcrypt.hash(password, SALTROUNDS);

        userToUpdate.email = email;
        userToUpdate.password = hashedPassword;
        
        let updatedUser;
        try {
            updatedUser = await userRepository.save(userToUpdate);
        } catch (e) {
            if ((e as any).code === "23505") { 
                throw new HttpError(
                    "Email already in use by another account.",
                    HttpStatusCode.BAD_REQUEST
                );
            }
            throw e;
        }
        
        await redisClient.del(cacheKey);

        res.status(200).json({
            message: "User updated successfully",
            data: instanceToPlain(updatedUser),
        });
    })
);

router.delete(
    "/:id",
    authMiddleware,
    asyncHandler(async (req: userRequest, res: Response) => {
        const userId = parseInt(req.params.id);
        const cacheKey = `${USER_CACHE_PREFIX}${userId}`;
        const reqUserId = req.user?.id;

        if (isNaN(userId))
            throw new HttpError(
                "Invalid user ID",
                HttpStatusCode.BAD_REQUEST
            );

        if (userId !== Number(reqUserId))
            throw new HttpError(
                "Unauthorized to delete this user",
                HttpStatusCode.FORBIDDEN
            );

        const user = await userRepository.findOneBy({ id: userId });
        if (!user)
            throw new HttpError(
                "User not found to delete.",
                HttpStatusCode.NOT_FOUND
            );

        const deleteResult = await userRepository.delete(userId);
        if (deleteResult.affected === 0)
            throw new HttpError(
                "User not found or already deleted.",
                HttpStatusCode.NOT_FOUND
            );
        
        await redisClient.del(cacheKey);

        res.status(200).json({
            message: "User deleted successfully",
        });
    })
);

export default router;