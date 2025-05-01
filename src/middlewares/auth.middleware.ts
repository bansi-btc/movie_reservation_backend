import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/jwt";

interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const { token } = req.cookies;
  if (!token) return res.status(401).json({ message: "Missing token" });
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const isAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== "ADMIN")
    return res.status(403).json({ message: "Admin access required" });

  next();
};
