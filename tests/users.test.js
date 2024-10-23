const request = require("supertest");
const express = require("express");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const { User } = require("../models");
const {
  register,
  login,
  getAllUser,
  displayUser,
  editUser,
  deleteUser,
  getDetailUser,
  updatePassword,
} = require("../controllers/user.controllers");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.post("/register", register);
app.post("/login", login);
app.get("/users", getAllUser);
app.get("/displayUser", displayUser);
app.put("/edit-users/:id", editUser);
app.delete("/delete-user/:id", deleteUser);
app.get("/detail-user/:id", getDetailUser);
app.post("/update-password", updatePassword);

jest.mock("../models", () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
  },
}));

jest.mock("bcryptjs", () => ({
  compareSync: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
}));

describe("POST /register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Normal Case: Successfully registering a user
  it("should register a new user successfully", async () => {
    const mockUser = {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      numberPhone: "1234567890",
      type: "user",
    };

    User.findOne.mockResolvedValue(null); // No existing user
    User.create.mockResolvedValue(mockUser);

    // Directly mock bcrypt.hashSync
    bcrypt.genSaltSync = jest.fn().mockReturnValue("genSaltSync");
    bcrypt.hashSync = jest.fn().mockReturnValue("hashedPassword");

    const response = await request(app).post("/register").send({
      name: "John Doe",
      email: "john@example.com",
      password: "password123",
      numberPhone: "1234567890",
      type: "user",
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(mockUser);
    expect(User.findOne).toHaveBeenCalledWith({
      where: {
        [Op.or]: [{ email: "john@example.com" }, { numberPhone: "1234567890" }],
      },
    });
    expect(User.create).toHaveBeenCalledWith({
      name: "John Doe",
      email: "john@example.com",
      password: "hashedPassword",
      numberPhone: "1234567890",
      type: "user",
    });
    expect(bcrypt.hashSync).toHaveBeenCalledWith("password123", "genSaltSync");
  });

  // Validation Case: Missing `name`
  it("should return 400 if `name` is missing", async () => {
    const response = await request(app).post("/register").send({
      email: "john@example.com",
      password: "password123",
      numberPhone: "1234567890",
      type: "user",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "'name' is required and must be a non-empty string.",
    });
    expect(User.findOne).not.toHaveBeenCalled();
    expect(User.create).not.toHaveBeenCalled();
  });

  // Validation Case: Invalid `email`
  it("should return 400 if `email` is invalid", async () => {
    const response = await request(app).post("/register").send({
      name: "John Doe",
      email: "invalid-email",
      password: "password123",
      numberPhone: "1234567890",
      type: "user",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "'email' is required and must be a valid email address.",
    });
    expect(User.findOne).not.toHaveBeenCalled();
    expect(User.create).not.toHaveBeenCalled();
  });

  // Validation Case: Password too short
  it("should return 400 if `password` is too short", async () => {
    const response = await request(app).post("/register").send({
      name: "John Doe",
      email: "john@example.com",
      password: "123",
      numberPhone: "1234567890",
      type: "user",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "'password' is required and must be at least 6 characters long.",
    });
    expect(User.findOne).not.toHaveBeenCalled();
    expect(User.create).not.toHaveBeenCalled();
  });

  // Error Case: Email or phone number already exists
  it("should return 400 if email or phone number already exists", async () => {
    User.findOne.mockResolvedValue({ email: "john@example.com" });

    const response = await request(app).post("/register").send({
      name: "John Doe",
      email: "john@example.com",
      password: "password123",
      numberPhone: "1234567890",
      type: "user",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "Email or phone number already exists",
    });
    expect(User.findOne).toHaveBeenCalledWith({
      where: {
        [Op.or]: [{ email: "john@example.com" }, { numberPhone: "1234567890" }],
      },
    });
    expect(User.create).not.toHaveBeenCalled();
  });

  // Error Case: Server error
  it("should return 500 if there is a server error", async () => {
    User.findOne.mockRejectedValue(new Error("Database error"));

    const response = await request(app).post("/register").send({
      name: "John Doe",
      email: "john@example.com",
      password: "password123",
      numberPhone: "1234567890",
      type: "user",
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal Server Error" });
    expect(User.findOne).toHaveBeenCalled();
  });
});

describe("POST /login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Normal Case: Successfully logging in
  it("should log in successfully with valid email and password", async () => {
    const mockUser = {
      id: 1,
      email: "john@example.com",
      password: "hashedPassword",
      name: "John Doe",
      type: "user",
    };

    User.findOne.mockResolvedValue(mockUser);
    bcrypt.compareSync.mockReturnValue(true);
    jwt.sign.mockReturnValue("mockToken");

    const response = await request(app).post("/login").send({
      email: "john@example.com",
      password: "password123",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "successful",
      token: "mockToken",
      name: "John Doe",
      type: "user",
      id: 1,
    });
    expect(User.findOne).toHaveBeenCalledWith({
      where: { email: "john@example.com" },
    });
    expect(bcrypt.compareSync).toHaveBeenCalledWith(
      "password123",
      "hashedPassword"
    );
    expect(jwt.sign).toHaveBeenCalledWith(
      { email: "john@example.com", type: "user" },
      "firewallbase64",
      { expiresIn: 60 * 60 }
    );
  });

  // Error Case: Incorrect password
  it("should return 401 if the password is incorrect", async () => {
    const mockUser = {
      id: 1,
      email: "john@example.com",
      password: "hashedPassword",
      name: "John Doe",
      type: "user",
    };

    User.findOne.mockResolvedValue(mockUser);
    bcrypt.compareSync.mockReturnValue(false);

    const response = await request(app).post("/login").send({
      email: "john@example.com",
      password: "wrongpassword",
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "dang nhap that bai, kiem tra lai mat khau",
    });
    expect(User.findOne).toHaveBeenCalledWith({
      where: { email: "john@example.com" },
    });
    expect(bcrypt.compareSync).toHaveBeenCalledWith(
      "wrongpassword",
      "hashedPassword"
    );
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  // Error Case: User not found
  it("should return 404 if the user is not found", async () => {
    User.findOne.mockResolvedValue(null);

    const response = await request(app).post("/login").send({
      email: "nonexistent@example.com",
      password: "password123",
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "khong co nguoi dung nay",
    });
    expect(User.findOne).toHaveBeenCalledWith({
      where: { email: "nonexistent@example.com" },
    });
    expect(bcrypt.compareSync).not.toHaveBeenCalled();
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  // Error Case: Server error
  it("should return 500 if there is a server error", async () => {
    User.findOne.mockRejectedValue(new Error("Database error"));

    const response = await request(app).post("/login").send({
      email: "john@example.com",
      password: "password123",
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal Server Error" });
  });
});

describe("GET /users", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test Case: Successfully fetching all users
  it("should return all users successfully", async () => {
    const mockUsers = [
      { id: 1, name: "John Doe", email: "john@example.com" },
      { id: 2, name: "Jane Doe", email: "jane@example.com" },
    ];

    User.findAll.mockResolvedValue(mockUsers);

    const response = await request(app).get("/users");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockUsers);
    expect(User.findAll).toHaveBeenCalledTimes(1);
  });

  // Test Case: Successfully fetching users filtered by name
  it("should return users filtered by name", async () => {
    const mockUsers = [{ id: 1, name: "John Doe", email: "john@example.com" }];

    User.findAll.mockResolvedValue(mockUsers);

    const response = await request(app).get("/users").query({ name: "John" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockUsers);
    expect(User.findAll).toHaveBeenCalledWith({
      where: {
        name: {
          [Op.like]: "%John%",
        },
      },
    });
  });

  // Test Case: No users found for given filter
  it("should return an empty array if no users match the filter", async () => {
    User.findAll.mockResolvedValue([]);

    const response = await request(app)
      .get("/users")
      .query({ name: "NonExistentUser" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
    expect(User.findAll).toHaveBeenCalledWith({
      where: {
        name: {
          [Op.like]: "%NonExistentUser%",
        },
      },
    });
  });

  // Test Case: Server error when fetching users
  it("should return 500 if there is a server error", async () => {
    User.findAll.mockRejectedValue(new Error("Database error"));

    const response = await request(app).get("/users");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal Server Error" });
  });
});

describe("GET /displayUser", () => {
  let res;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock response object
    res = {
      render: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  // Normal Case: Successfully fetching and passing data to res.render
  it("should fetch users and pass them to res.render", async () => {
    const mockUsers = [
      {
        id: 1,
        name: "John Doe",
        email: "john@example.com",
      },
      {
        id: 2,
        name: "Jane Doe",
        email: "jane@example.com",
      },
    ];

    User.findAll.mockResolvedValue(mockUsers);

    await displayUser({}, res);

    // Check if findAll is called once
    expect(User.findAll).toHaveBeenCalledTimes(1);

    // Check if res.render is called with the correct arguments
    expect(res.render).toHaveBeenCalledWith("user", {
      datatable: mockUsers,
    });
  });

  // Error Case: Handling internal server error
  it("should return 500 and error message if findAll fails", async () => {
    User.findAll.mockRejectedValue(new Error("Database error"));

    await displayUser({}, res);

    // Check if the response status is set to 500
    expect(res.status).toHaveBeenCalledWith(500);

    // Check if the correct error message is sent
    expect(res.send).toHaveBeenCalledWith("Internal Server Error");

    // Ensure render is not called
    expect(res.render).not.toHaveBeenCalled();
  });
});

describe("PUT /edit-users/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Normal Case: Successfully updating a user
  it("should update a user successfully", async () => {
    const mockUser = {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      save: jest.fn().mockResolvedValue(true),
    };

    User.findOne.mockResolvedValue(mockUser);

    const response = await request(app).put("/edit-users/1").send({
      name: "Jane Doe",
      email: "jane@example.com",
    });

    expect(response.status).toBe(200);
    expect(response.body.updateUser).toEqual(true);
    expect(User.findOne).toHaveBeenCalledWith({ where: { id: "1" } });
    expect(mockUser.save).toHaveBeenCalled();
    expect(mockUser.name).toBe("Jane Doe");
    expect(mockUser.email).toBe("jane@example.com");
  });

  // Validation Case: Invalid email
  it("should return 400 if 'email' is invalid", async () => {
    const response = await request(app).put("/edit-users/1").send({
      email: "invalid-email",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("'email' must be a valid email address.");
    expect(User.findOne).not.toHaveBeenCalled();
  });

  // Validation Case: Invalid phone number
  it("should return 400 if 'numberPhone' is invalid", async () => {
    const response = await request(app).put("/edit-users/1").send({
      numberPhone: "invalid-phone",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "'numberPhone' must be a valid phone number."
    );
    expect(User.findOne).not.toHaveBeenCalled();
  });

  // Error Case: User not found
  it("should return 404 if the user is not found", async () => {
    User.findOne.mockResolvedValue(null);

    const response = await request(app).put("/edit-users/999").send({
      name: "Non Existent",
    });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("User with id 999 not found");
  });

  // Error Case: Server error
  it("should return 500 if there is a server error", async () => {
    User.findOne.mockRejectedValue(new Error("Database error"));

    const response = await request(app).put("/edit-users/1").send({
      name: "John Doe",
    });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Internal Server Error");
  });
});

describe("DELETE /delete-user/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test Case: Successfully deleting a user
  it("should delete a user successfully", async () => {
    const mockUser = {
      id: 1,
      name: "John Doe",
      destroy: jest.fn().mockResolvedValue(true),
    };

    User.findOne.mockResolvedValue(mockUser);

    const response = await request(app).delete("/delete-user/1");

    expect(response.status).toBe(200);
    expect(response.text).toBe("Successful");
    expect(User.findOne).toHaveBeenCalledWith({ where: { id: "1" } });
    expect(mockUser.destroy).toHaveBeenCalledWith({ cascade: true });
  });

  // Test Case: User not found
  it("should return 404 if the user is not found", async () => {
    User.findOne.mockResolvedValue(null);

    const response = await request(app).delete("/delete-user/999");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "User with id 999 not found",
    });
  });

  // Error Case: Server error during deletion
  it("should return 500 if there is a server error", async () => {
    User.findOne.mockRejectedValue(new Error("Database error"));

    const response = await request(app).delete("/delete-user/1");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal Server Error" });
  });
});

describe("GET /detail-user/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test Case: Successfully fetching user details
  it("should fetch user details successfully", async () => {
    const mockUser = {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
    };

    User.findOne.mockResolvedValue(mockUser);

    const response = await request(app).get("/detail-user/1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockUser);
    expect(User.findOne).toHaveBeenCalledWith({
      where: { id: "1" },
    });
  });

  // Test Case: User not found
  it("should return 404 if the user is not found", async () => {
    User.findOne.mockResolvedValue(null);

    const response = await request(app).get("/detail-user/999");

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("User with id 999 not found.");
    expect(User.findOne).toHaveBeenCalledWith({
      where: { id: "999" },
    });
  });

  // Test Case: Server error
  it("should return 500 if there is a server error", async () => {
    User.findOne.mockRejectedValue(new Error("Database error"));

    const response = await request(app).get("/detail-user/1");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Internal Server Error");
  });
});

describe("POST /update-password", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test Case: Successfully updating the password
  it("should update the password successfully", async () => {
    const mockUser = {
      id: 1,
      password: "hashedPassword",
      update: jest.fn().mockResolvedValue(true),
    };

    User.findByPk.mockResolvedValue(mockUser);
    bcrypt.compareSync.mockReturnValue(true);
    bcrypt.hashSync.mockReturnValue("newHashedPassword");

    const response = await request(app).post("/update-password").send({
      userId: 1,
      currentPassword: "currentPassword123",
      newPassword: "newPassword123",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Password updated successfully",
    });
    expect(User.findByPk).toHaveBeenCalledWith(1);
    expect(bcrypt.compareSync).toHaveBeenCalledWith(
      "currentPassword123",
      "hashedPassword"
    );
    expect(bcrypt.hashSync).toHaveBeenCalledWith(
      "newPassword123",
      expect.any(String)
    );
    expect(mockUser.update).toHaveBeenCalledWith({
      password: "newHashedPassword",
    });
  });

  // Test Case: Missing userId
  it("should return 400 if 'userId' is missing", async () => {
    const response = await request(app).post("/update-password").send({
      currentPassword: "currentPassword123",
      newPassword: "newPassword123",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("'userId' is required.");
    expect(User.findByPk).not.toHaveBeenCalled();
  });

  // Test Case: Invalid currentPassword
  it("should return 400 if 'currentPassword' is invalid", async () => {
    const response = await request(app).post("/update-password").send({
      userId: 1,
      currentPassword: "123", // too short
      newPassword: "newPassword123",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "'currentPassword' is required and must be at least 6 characters long."
    );
    expect(User.findByPk).not.toHaveBeenCalled();
  });

  // Test Case: Invalid newPassword
  it("should return 400 if 'newPassword' is invalid", async () => {
    const response = await request(app).post("/update-password").send({
      userId: 1,
      currentPassword: "currentPassword123",
      newPassword: "123", // too short
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "'newPassword' is required and must be at least 6 characters long."
    );
    expect(User.findByPk).not.toHaveBeenCalled();
  });

  // Test Case: User not found
  it("should return 404 if the user is not found", async () => {
    User.findByPk.mockResolvedValue(null);

    const response = await request(app).post("/update-password").send({
      userId: 999,
      currentPassword: "currentPassword123",
      newPassword: "newPassword123",
    });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("User not found");
  });

  // Test Case: Invalid current password
  it("should return 401 if the current password is invalid", async () => {
    const mockUser = {
      id: 1,
      password: "hashedPassword",
    };

    User.findByPk.mockResolvedValue(mockUser);
    bcrypt.compareSync.mockReturnValue(false);

    const response = await request(app).post("/update-password").send({
      userId: 1,
      currentPassword: "wrongPassword123",
      newPassword: "newPassword123",
    });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Invalid current password");
    expect(User.findByPk).toHaveBeenCalledWith(1);
  });

  // Test Case: Server error
  it("should return 500 if there is a server error", async () => {
    User.findByPk.mockRejectedValue(new Error("Database error"));

    const response = await request(app).post("/update-password").send({
      userId: 1,
      currentPassword: "currentPassword123",
      newPassword: "newPassword123",
    });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Internal Server Error");
  });
});
