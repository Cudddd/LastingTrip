const request = require("supertest");
const express = require("express");
const { UrlImageHotel, urlHotel } = require("../models");
const {
  getAllUrlImageHotel,
  createUrlImageHotel,
  getUrlImageHotelById,
  updateUrlImageHotel,
  deleteUrlImageHotel,
} = require("../controllers/urlimagehotel.controller");

const cloudinary = require("cloudinary").v2;
const multer = require("multer");

const app = express();
app.use(express.json());
const upload = multer().array("files");

app.get("/urlImageHotel", getAllUrlImageHotel);
app.post("/upload", upload, createUrlImageHotel);
app.get("/imageUrls", getUrlImageHotelById);
app.put("/urlImageHotel/:id", updateUrlImageHotel);
app.delete("/urlImageHotel/:id", deleteUrlImageHotel);

jest.mock("../models", () => ({
  UrlImageHotel: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  urlHotel: jest.fn(),
}));

jest.mock("cloudinary", () => ({
  v2: {
    uploader: {
      destroy: jest.fn(),
    },
  },
}));

describe("UrlImageHotel Controller Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /urlImageHotel", () => {
    it("should return all UrlImageHotel records", async () => {
      const mockImages = [
        { id: 1, url: "http://example.com/image1.jpg", HotelId: 1 },
        { id: 2, url: "http://example.com/image2.jpg", HotelId: 1 },
      ];

      UrlImageHotel.findAll.mockResolvedValue(mockImages);

      const response = await request(app).get("/urlImageHotel");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockImages);
      expect(UrlImageHotel.findAll).toHaveBeenCalled();
    });

    it("should return 404 if no records are found", async () => {
      UrlImageHotel.findAll.mockResolvedValue([]);

      const response = await request(app).get("/urlImageHotel");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: "No UrlImageHotel records found",
      });
      expect(UrlImageHotel.findAll).toHaveBeenCalled();
    });

    it("should return 500 if there is a server error", async () => {
      UrlImageHotel.findAll.mockRejectedValue(new Error("Database error"));

      const response = await request(app).get("/urlImageHotel");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "Internal Server Error" });
    });
  });

  describe("POST /upload", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    // Normal Case: Successfully creating UrlImageHotel records for each uploaded file
    it("should create UrlImageHotel records for each uploaded file", async () => {
      UrlImageHotel.create.mockResolvedValue({});

      const response = await request(app)
        .post("/upload")
        .field("HotelId", "1")
        .attach("files", Buffer.from("file content 1"), "test-file1.jpg")
        .attach("files", Buffer.from("file content 2"), "test-file2.jpg");

      expect(response.status).toBe(201);
      expect(response.text).toEqual("successful");

      // Check that UrlImageHotel.create was called twice (for 2 files)
      expect(UrlImageHotel.create).toHaveBeenCalledTimes(2);
    });

    // Error Case: Server/database error during file creation
    it("should return 500 if there is a server error", async () => {
      UrlImageHotel.create.mockRejectedValue(new Error("Database error"));

      const response = await request(app)
        .post("/upload")
        .field("HotelId", "1")
        .attach("files", Buffer.from("file content 1"), "test-file1.jpg");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: "Internal Server Error",
        error: "Database error",
      });

      expect(UrlImageHotel.create).toHaveBeenCalledTimes(1);
    });

    // Validation Case: Missing `HotelId`
    it("should return 400 if HotelId is missing", async () => {
      const response = await request(app)
        .post("/upload")
        .attach("files", Buffer.from("file content 1"), "test-file1.jpg");

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "'HotelId' is required and must be a valid number.",
      });

      expect(UrlImageHotel.create).not.toHaveBeenCalled();
    });

    // Validation Case: Invalid `HotelId` (non-numeric)
    it("should return 400 if HotelId is not a valid number", async () => {
      const response = await request(app)
        .post("/upload")
        .field("HotelId", "invalid-id") // Invalid HotelId
        .attach("files", Buffer.from("file content 1"), "test-file1.jpg");

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "'HotelId' is required and must be a valid number.",
      });

      expect(UrlImageHotel.create).not.toHaveBeenCalled();
    });

    // Validation Case: No files attached
    it("should still return 201 when no files are attached (no file validation)", async () => {
      const response = await request(app).post("/upload").field("HotelId", "1");

      expect(response.status).toBe(201);
      expect(response.text).toEqual("successful");

      expect(UrlImageHotel.create).not.toHaveBeenCalled(); // No file creation attempted
    });
  });

  describe("GET /imageUrls", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    // Normal Case: Successfully fetching image URLs by hotel ID
    it("should return image URLs by hotel ID", async () => {
      const mockUrls = [
        { id: 1, url: "http://example.com/image1.jpg", HotelId: 1 },
      ];
      UrlImageHotel.findAll.mockResolvedValue(mockUrls);

      const response = await request(app)
        .get("/imageUrls")
        .query({ HotelId: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        { id: 1, url: "http://example.com/image1.jpg" },
      ]);

      expect(UrlImageHotel.findAll).toHaveBeenCalledWith({
        where: { HotelId: "1" },
      });
    });

    // Case: No image URLs found for the given HotelId
    it("should return 404 if no image URLs are found for the given HotelId", async () => {
      UrlImageHotel.findAll.mockResolvedValue([]);

      const response = await request(app).get("/imageUrls").query({
        HotelId: 999,
      });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: "No image URLs found for this hotelId",
      });

      expect(UrlImageHotel.findAll).toHaveBeenCalledWith({
        where: { HotelId: "999" },
      });
    });

    // Error Case: Server/database error while fetching image URLs
    it("should return 500 if there is a server error", async () => {
      UrlImageHotel.findAll.mockRejectedValue(new Error("Database error"));

      const response = await request(app).get("/imageUrls").query({
        HotelId: 1,
      });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "Internal Server Error" });
    });

    // Validation Case: Missing `HotelId` in the request query
    it("should return 400 if HotelId is missing in the request", async () => {
      const response = await request(app).get("/imageUrls");

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "'HotelId' is required and must be provided.",
      });

      expect(UrlImageHotel.findAll).not.toHaveBeenCalled();
    });

    // Validation Case: Invalid `HotelId` (non-numeric)
    it("should return 400 if HotelId is not a valid number", async () => {
      const response = await request(app)
        .get("/imageUrls")
        .query({ HotelId: "invalid-id" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "'HotelId' must be a valid number.",
      });

      expect(UrlImageHotel.findAll).not.toHaveBeenCalled();
    });
  });

  describe("PUT /urlImageHotel/:id", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should update UrlImageHotel successfully", async () => {
      const mockUrlImageHotel = {
        id: 1,
        url: "http://example.com/old_image.jpg",
        HotelId: 1,
        update: jest.fn().mockResolvedValue({
          id: 1,
          url: "http://example.com/new_image.jpg",
          HotelId: 1,
        }),
      };
      UrlImageHotel.findByPk.mockResolvedValue(mockUrlImageHotel);

      const response = await request(app)
        .put("/urlImageHotel/1")
        .send({ url: "http://example.com/new_image.jpg", HotelId: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: 1,
          url: "http://example.com/new_image.jpg",
          HotelId: 1,
        })
      );
    });

    it("should return 404 if UrlImageHotel not found", async () => {
      UrlImageHotel.findByPk.mockResolvedValue(null);

      const response = await request(app)
        .put("/urlImageHotel/999")
        .send({ url: "http://example.com/image.jpg", HotelId: 1 });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "UrlHotel not found" });
    });

    it("should return 500 if there is a server error during update", async () => {
      UrlImageHotel.findByPk.mockRejectedValue(new Error("Database error"));

      const response = await request(app)
        .put("/urlImageHotel/1")
        .send({ url: "http://example.com/image.jpg", HotelId: 1 });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "Internal Server Error" });
    });

    // Validation Case: Missing `url`
    it("should return 400 if url is missing", async () => {
      const response = await request(app).put("/urlImageHotel/1").send({
        HotelId: 1, // Missing `url`
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "'url' is required.",
      });

      expect(UrlImageHotel.findByPk).not.toHaveBeenCalled();
    });

    // Validation Case: Missing `HotelId`
    it("should return 400 if HotelId is missing", async () => {
      const response = await request(app).put("/urlImageHotel/1").send({
        url: "http://example.com/image.jpg", // Missing `HotelId`
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "'HotelId' is required and must be a valid number.",
      });

      expect(UrlImageHotel.findByPk).not.toHaveBeenCalled();
    });

    // Validation Case: Invalid `HotelId`
    it("should return 400 if HotelId is not a valid number", async () => {
      const response = await request(app).put("/urlImageHotel/1").send({
        url: "http://example.com/image.jpg",
        HotelId: "invalid-id", // Invalid `HotelId`
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "'HotelId' is required and must be a valid number.",
      });

      expect(UrlImageHotel.findByPk).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /urlImageHotel/:id", () => {
    it("should delete UrlImageHotel and associated cloudinary image", async () => {
      const mockUrlImageHotel = {
        id: 1,
        file_name: "image.jpg",
        destroy: jest.fn(),
      };
      UrlImageHotel.findByPk.mockResolvedValue(mockUrlImageHotel);
      cloudinary.uploader.destroy.mockResolvedValue({ result: "ok" });

      const response = await request(app).delete("/urlImageHotel/1");

      expect(response.status).toBe(200);
      expect(response.text).toEqual("Xóa ảnh thành công");
      expect(UrlImageHotel.findByPk).toHaveBeenCalledWith("1");
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("image.jpg");
      expect(mockUrlImageHotel.destroy).toHaveBeenCalled();
    });

    it("should return 404 if UrlImageHotel is not found", async () => {
      UrlImageHotel.findByPk.mockResolvedValue(null);

      const response = await request(app).delete("/urlImageHotel/999");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "Không tìm thấy ảnh để xóa" });
    });

    it("should return 500 if there is a server error during deletion", async () => {
      UrlImageHotel.findByPk.mockRejectedValue(new Error("Database error"));

      const response = await request(app).delete("/urlImageHotel/1");

      expect(response.status).toBe(500);
    });
  });
});
