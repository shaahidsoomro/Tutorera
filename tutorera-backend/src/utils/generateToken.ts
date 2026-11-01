import jwt, { SignOptions } from "jsonwebtoken";
import { Response } from "express";
import { IUser } from "../types";

export const generateToken = (userId: string, role: string): string => {
  const options: SignOptions = {
    algorithm: "HS256",
    expiresIn: "7d",
  };

  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET as string,
    options
  );
};

export const sendTokenResponse = (
  user: IUser,
  statusCode: number,
  res: Response
): void => {
  const token = generateToken(user._id.toString(), user.role);

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
  };

  res.cookie("token", token, cookieOptions);

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus || "registered",
      isVerified: user.isVerified,
      isApproved: user.isApproved,
      avatar: user.avatar,
      isMinor: user.isMinor === true,
      parentConsentVerified: user.parentConsentVerified === true,
    },
  });
};