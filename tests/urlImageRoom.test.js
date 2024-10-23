const request = require("supertest");
const express = require("express");
const multer = require("multer");

const { UrlImageRoom } = require("../models");
const cloudinary = require("cloudinary").v2;
const {
  createUrlImageRoom,
  getUrlImageRoomById,
  updateUrlImageRoom,
  deleteUrlImageRoom,
  getAllUrlImageRoom,
} = require("../controllers/urlImageRoom.controller");

const app = express();
app.use(express.json());
const upload = multer().array("files"); // Using multer to handle file uploads
app.post("/upload", upload, createUrlImageRoom);
app.get("/urlImageRoom", getUrlImageRoomById);
app.put("/urlImageRoom/:id", updateUrlImageRoom);
app.delete("/urlImageRoom/:id", deleteUrlImageRoom);
app.get("/urlImageRoom/all", getAllUrlImageRoom);

jest.mock("../models", () => ({
  UrlImageRoom: {
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock("cloudinary", () => ({
  v2: {
    uploader: {
      destroy: jest.fn(),
    },
  },
}));

describe("UrlImageRoom Controller Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /upload", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    // Normal Case: Successfully creating UrlImageRoom records for each uploaded file
    it("should create UrlImageRoom records for each uploaded file", async () => {
      UrlImageRoom.create.mockResolvedValue({});

      const response = await request(app)
        .post("/upload")
        .field("IdRoom", "1")
        .attach("files", Buffer.from("file content 1"), "test-file1.jpg")
        .attach("files", Buffer.from("file content 2"), "test-file2.jpg");

      expect(response.status).toBe(201);
      expect(response.text).toEqual("successful");
      expect(UrlImageRoom.create).toHaveBeenCalledTimes(2);
    });

    // Error Case: Server/database error during creation
    it("should return 500 if there is a server error during creation", async () => {
      UrlImageRoom.create.mockRejectedValue(new Error("Database error"));

      const response = await request(app)
        .post("/upload")
        .field("IdRoom", "1")
        .attach("files", Buffer.from("file content"), "test-file.jpg");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: "Internal Server Error",
        error: "Database error",
      });
    });

    // Validation Case: Missing `IdRoom`
    it("should return 400 if IdRoom is missing", async () => {
      const response = await request(app)
        .post("/upload")
        .attach("files", Buffer.from("file content 1"), "test-file1.jpg");

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "'IdRoom' is required and must be a valid number.",
      });

      expect(UrlImageRoom.create).not.toHaveBeenCalled();
    });

    // Validation Case: Invalid `IdRoom` (non-numeric)
    it("should return 400 if IdRoom is not a valid number", async () => {
      const response = await request(app)
        .post("/upload")
        .field("IdRoom", "invalid-id") // Invalid IdRoom
        .attach("files", Buffer.from("file content"), "test-file1.jpg");

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "'IdRoom' is required and must be a valid number.",
      });

      expect(UrlImageRoom.create).not.toHaveBeenCalled();
    });

    // Validation Case: No files attached
    it("should still return 201 when no files are attached (no file validation)", async () => {
      const response = await request(app).post("/upload").field("IdRoom", "1");

      expect(response.status).toBe(201);
      expect(response.text).toEqual("successful");

      expect(UrlImageRoom.create).not.toHaveBeenCalled(); // No file creation attempted
    });
  });

  describe("GET /urlImageRoom", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    // Normal Case: Successfully fetching image URLs by room ID
    it("should return image URLs by room ID", async () => {
      const mockUrls = [
        { id: 1, url: "http://example.com/image1.jpg", IdRoom: 1 },
      ];
      UrlImageRoom.findAll.mockResolvedValue(mockUrls);

      const response = await request(app)
        .get("/urlImageRoom")
        .query({ IdRoom: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockUrls);
      expect(UrlImageRoom.findAll).toHaveBeenCalledWith({
        where: { IdRoom: "1" },
      });
    });

    // Error Case: Server/database error during fetching
    it("should return 500 if there is a server error", async () => {
      UrlImageRoom.findAll.mockRejectedValue(new Error("Database error"));

      const response = await request(app)
        .get("/urlImageRoom")
        .query({ IdRoom: 1 });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: "Internal Server Error",
      });
    });

    // Validation Case: Missing `IdRoom` in query params
    it("should return 400 if IdRoom is missing in the request query", async () => {
      const response = await request(app).get("/urlImageRoom");

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "'IdRoom' is required and must be a valid number.",
      });

      expect(UrlImageRoom.findAll).not.toHaveBeenCalled();
    });

    // Validation Case: Invalid `IdRoom` (non-numeric)
    it("should return 400 if IdRoom is not a valid number", async () => {
      const response = await request(app)
        .get("/urlImageRoom")
        .query({ IdRoom: "invalid-id" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "'IdRoom' is required and must be a valid number.",
      });

      expect(UrlImageRoom.findAll).not.toHaveBeenCalled();
    });

    // Case: No image URLs found for the given room ID
    it("should return 404 if no image URLs are found for the given IdRoom", async () => {
      UrlImageRoom.findAll.mockResolvedValue([]);

      const response = await request(app)
        .get("/urlImageRoom")
        .query({ IdRoom: 999 });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: "urlRoom not found",
      });

      expect(UrlImageRoom.findAll).toHaveBeenCalledWith({
        where: { IdRoom: "999" },
      });
    });
  });

  describe("PUT /urlImageRoom/:id", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    // Normal Case: Successfully updating UrlImageRoom
    it("should update UrlImageRoom", async () => {
      const mockUrlImageRoom = {
        id: 1,
        url: "http://example.com/old_image.jpg",
        IdRoom: 1,
        update: jest.fn().mockResolvedValue({
          id: 1,
          url: "http://example.com/new_image.jpg",
          IdRoom: 1,
        }),
      };

      UrlImageRoom.findByPk.mockResolvedValue(mockUrlImageRoom);

      const response = await request(app)
        .put("/urlImageRoom/1")
        .send({ url: "http://example.com/new_image.jpg", IdRoom: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: 1,
          url: "http://example.com/new_image.jpg",
          IdRoom: 1,
        })
      );
      expect(mockUrlImageRoom.update).toHaveBeenCalledWith({
        url: "http://example.com/new_image.jpg",
        IdRoom: 1,
      });
    });

    // Error Case: UrlImageRoom not found
    it("should return 404 if UrlImageRoom is not found", async () => {
      UrlImageRoom.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .put("/urlImageRoom/999")
        .send({ url: "http://example.com/image.jpg", IdRoom: 1 });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "urlRoom not found" });
    });

    // Error Case: Server/database error
    it("should return 500 if there is a server error during update", async () => {
      UrlImageRoom.findByPk.mockRejectedValue(new Error("Database error"));

      const response = await request(app)
        .put("/urlImageRoom/1")
        .send({ url: "http://example.com/image.jpg", IdRoom: 1 });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: "Internal Server Error",
      });
    });

    // Validation Case: Missing `url`
    it("should return 400 if url is missing", async () => {
      const response = await request(app).put("/urlImageRoom/1").send({
        IdRoom: 1, // Missing `url`
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "'url' is required.",
      });

      expect(UrlImageRoom.findByPk).not.toHaveBeenCalled();
    });

    // Validation Case: Missing `IdRoom`
    it("should return 400 if IdRoom is missing", async () => {
      const response = await request(app).put("/urlImageRoom/1").send({
        url: "http://example.com/image.jpg", // Missing `IdRoom`
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "'IdRoom' is required and must be a valid number.",
      });

      expect(UrlImageRoom.findByPk).not.toHaveBeenCalled();
    });

    // Validation Case: Invalid `IdRoom`
    it("should return 400 if IdRoom is not a valid number", async () => {
      const response = await request(app).put("/urlImageRoom/1").send({
        url: "http://example.com/image.jpg",
        IdRoom: "invalid-id", // Invalid `IdRoom`
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "'IdRoom' is required and must be a valid number.",
      });

      expect(UrlImageRoom.findByPk).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /urlImageRoom/:id", () => {
    it("should delete UrlImageRoom and associated cloudinary image", async () => {
      const mockUrlImageRoom = {
        id: 1,
        file_name: "test-file.jpg",
        destroy: jest.fn(),
      };
      UrlImageRoom.findOne.mockResolvedValue(mockUrlImageRoom);
      cloudinary.uploader.destroy.mockResolvedValue({ result: "ok" });

      const response = await request(app).delete("/urlImageRoom/1");

      expect(response.status).toBe(204);
      expect(UrlImageRoom.findOne).toHaveBeenCalledWith({ where: { id: "1" } });
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("test-file.jpg");
      expect(mockUrlImageRoom.destroy).toHaveBeenCalled();
    });

    it("should return 404 if UrlImageRoom is not found", async () => {
      UrlImageRoom.findOne.mockResolvedValue(null);

      const response = await request(app).delete("/urlImageRoom/999");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "urlRoom not found" });
    });

    it("should return 500 if there is a server error during deletion", async () => {
      UrlImageRoom.findOne.mockRejectedValue(new Error("Database error"));

      const response = await request(app).delete("/urlImageRoom/1");

      expect(response.status).toBe(500);
    });
  });

  describe("GET /urlImageRoom/all", () => {
    it("should return all UrlImageRoom records", async () => {
      const mockRecords = [
        { id: 1, url: "http://example.com/image1.jpg", IdRoom: 1 },
        { id: 2, url: "http://example.com/image2.jpg", IdRoom: 1 },
      ];

      UrlImageRoom.findAll.mockResolvedValue(mockRecords);

      const response = await request(app).get("/urlImageRoom/all");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRecords);
    });

    it("should return 404 if no UrlImageRoom records are found", async () => {
      UrlImageRoom.findAll.mockResolvedValue([]);

      const response = await request(app).get("/urlImageRoom/all");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "No UrlImageRoom records found" });
    });

    it("should return 500 if there is a server error", async () => {
      UrlImageRoom.findAll.mockRejectedValue(new Error("Database error"));

      const response = await request(app).get("/urlImageRoom/all");

      expect(response.status).toBe(500);
    });
  });
});
