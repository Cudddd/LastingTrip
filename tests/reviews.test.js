const request = require("supertest");
const express = require("express");
const multer = require("multer");

const { Reviews, Hotels, User } = require("../models");
const {
  createReview,
  deleteReview,
  updateReview,
  getDetailReview,
  getAllReview,
  getFullReview,
} = require("../controllers/reviews.controllers");

const app = express();
app.use(express.json());
const upload = multer().single("file"); // Handle single file upload

app.post("/reviews", upload, createReview);
app.get("/reviews", getAllReview);
app.get("/reviews/:id", getDetailReview);
app.get("/getallreviews", getFullReview);
app.put("/reviews/:id", updateReview);
app.delete("/reviews/:id", deleteReview);

jest.mock("../models", () => ({
  Reviews: {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    destroy: jest.fn(),
    save: jest.fn(),
  },
  Hotels: {},
  User: {},
}));

describe("Reviews Controller Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /reviews", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    // Normal Case: Successfully creating a review with a file attached
    it("should create a review with a file attached", async () => {
      const mockReview = {
        id: 1,
        rating: 5,
        description: "Excellent stay",
        hotelId: 1,
        guestId: 1,
        file: "http://example.com/image.jpg",
      };

      Reviews.create.mockResolvedValue(mockReview);

      const response = await request(app)
        .post("/reviews")
        .field("rating", 5)
        .field("description", "Excellent stay")
        .field("hotelId", 1)
        .field("guestId", 1)
        .attach("file", Buffer.from("file content"), "test-file.jpg");

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockReview);
    });

    // Error Case: Missing required fields (rating, description, hotelId, guestId)
    it("should return 400 if input data is missing", async () => {
      const response = await request(app).post("/reviews").send({ rating: 5 });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "All fields are required" });
      expect(Reviews.create).not.toHaveBeenCalled();
    });

    // Validation Case: Invalid or missing `description`
    it("should return 400 if `description` is missing or empty", async () => {
      const response = await request(app)
        .post("/reviews")
        .field("rating", 5)
        .field("hotelId", 1)
        .field("guestId", 1)
        .field("description", ""); // Empty description

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "'description' must be a non-empty string.",
      });

      expect(Reviews.create).not.toHaveBeenCalled();
    });

    // Validation Case: Missing `file` (but allowed as it's optional)
    it("should create a review even if no file is provided", async () => {
      const mockReview = {
        id: 1,
        rating: 5,
        description: "Excellent stay",
        hotelId: 1,
        guestId: 1,
      };

      Reviews.create.mockResolvedValue(mockReview);

      const response = await request(app)
        .post("/reviews")
        .field("rating", 5)
        .field("description", "Excellent stay")
        .field("hotelId", 1)
        .field("guestId", 1);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockReview);
      expect(Reviews.create).toHaveBeenCalledWith({
        rating: "5",
        description: "Excellent stay",
        hotelId: "1",
        guestId: "1",
      });
    });

    // Error Case: Server/database error
    it("should return 500 if there is a server error", async () => {
      Reviews.create.mockRejectedValue(new Error("Database error"));

      const response = await request(app)
        .post("/reviews")
        .field("rating", 5)
        .field("description", "Great stay")
        .field("hotelId", 1)
        .field("guestId", 1);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: "Internal Server Error",
      });
    });
  });

  describe("GET /reviews", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    // Normal Case: Successfully fetching all reviews for a hotel
    it("should return all reviews for a hotel", async () => {
      const mockReviews = [
        {
          id: 1,
          rating: 5,
          description: "Excellent stay",
          hotelId: 1,
          guestId: 1,
          createdAt: "2023-10-12T10:00:00Z",
          updatedAt: "2023-10-12T12:00:00Z",
          Hotel: { name: "Sunrise Hotel" },
          User: { name: "John Doe", url: "http://example.com/avatar.jpg" },
        },
      ];

      Reviews.findAll.mockResolvedValue(mockReviews);

      const response = await request(app).get("/reviews").query({ hotelId: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            rating: 5,
            description: "Excellent stay",
            hotelId: 1,
            hotelName: "Sunrise Hotel",
            guestName: "John Doe",
            guestAvatar: "http://example.com/avatar.jpg",
          }),
        ])
      );
    });

    // Case: No reviews found for the given hotel
    it("should return 404 if no reviews are found", async () => {
      Reviews.findAll.mockResolvedValue([]);

      const response = await request(app)
        .get("/reviews")
        .query({ hotelId: 999 });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: "No reviews found for this hotel",
      });
    });

    // Error Case: Server error
    it("should return 500 if there is a server error", async () => {
      Reviews.findAll.mockRejectedValue(new Error("Database error"));

      const response = await request(app).get("/reviews").query({ hotelId: 1 });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "Internal Server Error" });
    });

    // Validation Case: Missing `hotelId` in query params
    it("should return 400 if `hotelId` is missing", async () => {
      const response = await request(app).get("/reviews");

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "'hotelId' is required and must be a valid number.",
      });

      expect(Reviews.findAll).not.toHaveBeenCalled();
    });

    // Validation Case: Invalid `hotelId` (non-numeric)
    it("should return 400 if `hotelId` is not a valid number", async () => {
      const response = await request(app)
        .get("/reviews")
        .query({ hotelId: "abc" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "'hotelId' is required and must be a valid number.",
      });

      expect(Reviews.findAll).not.toHaveBeenCalled();
    });
  });

  describe("GET /reviews/:id", () => {
    it("should return a specific review by ID", async () => {
      const mockReview = {
        id: 1,
        rating: 5,
        description: "Excellent stay",
        hotelId: 1,
        guestId: 1,
      };

      Reviews.findOne.mockResolvedValue(mockReview);

      const response = await request(app).get("/reviews/1");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockReview);
    });

    it("should return 500 if there is a server error", async () => {
      Reviews.findOne.mockRejectedValue(new Error("Database error"));

      const response = await request(app).get("/reviews/1");

      expect(response.status).toBe(500);
    });
  });

  describe("PUT /reviews/:id", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    // Normal Case: Successfully updating a review
    it("should update a review and return the updated review", async () => {
      const mockReview = {
        id: 1,
        name: "Luxury Room",
        address: "123 Hotel St",
        star: 5,
        price: 300,
        save: jest.fn().mockResolvedValue(),
      };

      Reviews.findOne.mockResolvedValue(mockReview);

      const response = await request(app).put("/reviews/1").send({
        name: "Updated Room",
        address: "456 Updated St",
        star: 4,
        price: 250,
      });

      expect(response.status).toBe(200);
      expect(mockReview.save).toHaveBeenCalled();
      expect(Reviews.findOne).toHaveBeenCalledWith({ where: { id: "1" } });
      expect(response.body).toEqual(
        expect.objectContaining({
          name: "Updated Room",
          address: "456 Updated St",
          star: 4,
          price: 250,
        })
      );
    });

    // Error Case: Server error
    it("should return 500 if there is a server error", async () => {
      Reviews.findOne.mockRejectedValue(new Error("Database error"));

      const response = await request(app).put("/reviews/1").send({
        name: "Luxury Room",
        address: "123 Hotel St",
        star: 5,
        price: 300,
      });

      expect(response.status).toBe(500);
    });

    // Validation Case: Missing `name`
    it("should return 400 if `name` is missing", async () => {
      const response = await request(app).put("/reviews/1").send({
        address: "123 Hotel St",
        star: 5,
        price: 300,
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "'name' is required and must be a non-empty string.",
      });
      expect(Reviews.findOne).not.toHaveBeenCalled();
    });

    // Validation Case: Missing `address`
    it("should return 400 if `address` is missing", async () => {
      const response = await request(app).put("/reviews/1").send({
        name: "Luxury Room",
        star: 5,
        price: 300,
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "'address' is required and must be a non-empty string.",
      });
      expect(Reviews.findOne).not.toHaveBeenCalled();
    });

    // Validation Case: Invalid `star` (not between 1 and 5)
    it("should return 400 if `star` is not a number between 1 and 5", async () => {
      const response = await request(app).put("/reviews/1").send({
        name: "Luxury Room",
        address: "123 Hotel St",
        star: 6, // Invalid star
        price: 300,
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "'star' must be a number between 1 and 5.",
      });
      expect(Reviews.findOne).not.toHaveBeenCalled();
    });

    // Validation Case: Invalid `price` (negative number)
    it("should return 400 if `price` is a negative number", async () => {
      const response = await request(app).put("/reviews/1").send({
        name: "Luxury Room",
        address: "123 Hotel St",
        star: 5,
        price: -100, // Invalid price
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "'price' must be a non-negative number.",
      });
      expect(Reviews.findOne).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /reviews/:id", () => {
    it("should delete a review", async () => {
      const mockReview = { id: 1, destroy: jest.fn().mockResolvedValue() };

      Reviews.findOne.mockResolvedValue(mockReview);

      const response = await request(app).delete("/reviews/1");

      expect(response.status).toBe(200);
      expect(mockReview.destroy).toHaveBeenCalled();
    });

    it("should return 500 if there is a server error", async () => {
      Reviews.findOne.mockRejectedValue(new Error("Database error"));

      const response = await request(app).delete("/reviews/1");

      expect(response.status).toBe(500);
    });
  });

  describe("GET /getallreviews", () => {
    it("should return all reviews", async () => {
      const mockReviews = [
        {
          id: 1,
          rating: 5,
          description: "Excellent stay",
          createdAt: "2023-10-12T10:00:00Z",
          updatedAt: "2023-10-12T12:00:00Z",
          hotelId: 1,
          Hotel: { name: "Sunrise Hotel" },
          User: { name: "John Doe", url: "http://example.com/avatar.jpg" },
        },
      ];

      Reviews.findAll.mockResolvedValue(mockReviews);

      const response = await request(app).get("/getallreviews");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            Hotel: { name: "Sunrise Hotel" },
            User: { name: "John Doe", url: "http://example.com/avatar.jpg" },
            createdAt: "2023-10-12T10:00:00Z",
            description: "Excellent stay",
            hotelId: 1,
            id: 1,
            rating: 5,
            updatedAt: "2023-10-12T12:00:00Z",
          }),
        ])
      );
    });

    it("should return empty array", async () => {
      const mockReviews = [];

      Reviews.findAll.mockResolvedValue(mockReviews);

      const response = await request(app).get("/getallreviews");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.arrayContaining([]));
    });

    it("should return 500 if there is a server error", async () => {
      Reviews.findAll.mockRejectedValue(new Error("Database error"));

      const response = await request(app).get("/getallreviews");

      expect(response.status).toBe(500);
    });
  });
});
