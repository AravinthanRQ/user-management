import jwt from "jsonwebtoken";

export const generateToken = ({ id, email }: { id: string; email: string }) => {
    const JWTSECRET = process.env.JWT_SECRET;
    if (!JWTSECRET) throw new Error("Jwt secret not found in .env");
    const generatedToken = jwt.sign({ id, email }, JWTSECRET, {
        expiresIn: "1h",
    });
    return generatedToken
};
