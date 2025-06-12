import { Request, Response, NextFunction } from "express";
import { JwtPayload, userRequest } from "../utils/types";
import jwt from "jsonwebtoken";

export const authMiddleware = (
  req: userRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      message: "Authentication token is required and must be a Bearer token.",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Token not present after bearer" });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    res.status(500).json({
      message: "Internal server error: JWT secret not configured.",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: "Authentication token has expired." });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ message: "Authentication token is invalid." });
      return;
    }
    console.error("Error verifying JWT token:", error);
    res.status(500).json({ message: "Failed to authenticate token." });
    return;
  }
};
