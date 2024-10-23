const request = require("supertest");
const express = require("express");
const { User } = require("../models");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const {
  forgotPassword,
  resetPassword,
} = require("../controllers/authen.controller");

const app = express();
app.use(express.json());
app.post("/forgot-password", forgotPassword);
app.post("/reset-password", resetPassword);

jest.mock("../models", () => ({
  User: {
    findOne: jest.fn(),
  },
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn(),
  }),
}));

jest.mock("bcryptjs", () => ({
  genSaltSync: jest.fn().mockReturnValue("mockSalt"),
  hashSync: jest.fn().mockReturnValue("mockHashedPassword"),
}));

describe("POST /forgot-password", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test Case: Successfully sending a password reset email
  it("should send a password reset email successfully", async () => {
    const mockUser = {
      id: 1,
      email: "john@example.com",
    };

    User.findOne.mockResolvedValue(mockUser);
    jwt.sign.mockReturnValue("mockToken");

    const transporter = nodemailer.createTransport();
    transporter.sendMail.mockResolvedValue(true);

    const response = await request(app).post("/forgot-password").send({
      email: "john@example.com",
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Password reset email sent");
    expect(User.findOne).toHaveBeenCalledWith({
      where: { email: "john@example.com" },
    });
    expect(jwt.sign).toHaveBeenCalledWith(
      { email: "john@example.com" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    expect(transporter.sendMail).toHaveBeenCalledWith({
      from: process.env.EMAIL_USERNAME,
      to: "john@example.com",
      subject: "Password Reset Request",
      text: "Your password reset token is: mockToken",
    });
  });

  // Test Case: User not found
  it("should return 404 if the user is not found", async () => {
    User.findOne.mockResolvedValue(null);

    const response = await request(app).post("/forgot-password").send({
      email: "nonexistent@example.com",
    });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("User not found");
    expect(User.findOne).toHaveBeenCalledWith({
      where: { email: "nonexistent@example.com" },
    });
  });

  // Test Case: Server error during the process
  it("should return 500 if there is a server error", async () => {
    User.findOne.mockRejectedValue(new Error("Database error"));

    const response = await request(app).post("/forgot-password").send({
      email: "john@example.com",
    });

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Internal Server Error");
    expect(User.findOne).toHaveBeenCalledWith({
      where: { email: "john@example.com" },
    });
  });
});

describe("POST /reset-password", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test Case: Successfully resetting the password
  it("should reset the password successfully", async () => {
    const mockUser = {
      email: "john@example.com",
      password: "oldHashedPassword",
      save: jest.fn().mockResolvedValue(true),
    };

    jwt.verify.mockReturnValue({ email: "john@example.com" });
    User.findOne.mockResolvedValue(mockUser);

    const response = await request(app).post("/reset-password").send({
      token: "mockToken",
      newpassword: "newPassword123",
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Password reset successfully");
    expect(jwt.verify).toHaveBeenCalledWith(
      "mockToken",
      process.env.JWT_SECRET
    );
    expect(User.findOne).toHaveBeenCalledWith({
      where: { email: "john@example.com" },
    });
    expect(bcrypt.genSaltSync).toHaveBeenCalledWith(10);
    expect(bcrypt.hashSync).toHaveBeenCalledWith("newPassword123", "mockSalt");
    expect(mockUser.password).toBe("mockHashedPassword");
    expect(mockUser.save).toHaveBeenCalled();
  });

  // Test Case: Missing new password
  it("should return 400 if 'newpassword' is missing", async () => {
    const response = await request(app).post("/reset-password").send({
      token: "mockToken",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("New password is required");
    expect(jwt.verify).not.toHaveBeenCalled();
    expect(User.findOne).not.toHaveBeenCalled();
  });

  // Test Case: Invalid or expired token
  it("should return 404 if the token is invalid or the user is not found", async () => {
    jwt.verify.mockReturnValue({ email: "invalid@example.com" });
    User.findOne.mockResolvedValue(null);

    const response = await request(app).post("/reset-password").send({
      token: "invalidToken",
      newpassword: "newPassword123",
    });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Invalid or expired token");
    expect(jwt.verify).toHaveBeenCalledWith(
      "invalidToken",
      process.env.JWT_SECRET
    );
    expect(User.findOne).toHaveBeenCalledWith({
      where: { email: "invalid@example.com" },
    });
  });

  // Test Case: Server error
  it("should return 500 if there is a server error", async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error("Invalid token");
    });

    const response = await request(app).post("/reset-password").send({
      token: "mockToken",
      newpassword: "newPassword123",
    });

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Internal Server Error");
    expect(jwt.verify).toHaveBeenCalledWith(
      "mockToken",
      process.env.JWT_SECRET
    );
  });
});
