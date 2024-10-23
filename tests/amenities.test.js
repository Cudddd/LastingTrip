const request = require("supertest");
const express = require("express");
const { Amenities, Op } = require("../models");
const {
  createAmenity,
  getAllAmenity,
  getDetailAmenity,
} = require("../controllers/amenities.controller");

const app = express();
app.use(express.json());

app.post("/amenities", createAmenity);
app.get("/amenities", getAllAmenity);
app.get("/amenities/:id", getDetailAmenity);

jest.mock("../models", () => ({
  Amenities: {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  },
  Op: {
    like: jest.fn(),
  },
}));

beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
});

describe("POST /amenities", () => {
  it("should create a new amenity and return 201 status", async () => {
    const mockAmenity = { id: 1, name: "Pool", Aclass: "Luxury" };
    Amenities.create.mockResolvedValue(mockAmenity);

    const response = await request(app)
      .post("/amenities")
      .send({ name: "Pool", Aclass: "Luxury" });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(mockAmenity);
    expect(Amenities.create).toHaveBeenCalledWith({
      name: "Pool",
      Aclass: "Luxury",
    });
  });

  it("should return 500 status when there is a server error", async () => {
    Amenities.create.mockRejectedValue(new Error("Database error"));

    const response = await request(app)
      .post("/amenities")
      .send({ name: "Pool", Aclass: "Luxury" });

    expect(response.status).toBe(500);
  });

  // Validation tests for missing fields
  it("should return 400 status when name is missing", async () => {
    const response = await request(app)
      .post("/amenities")
      .send({ Aclass: "Luxury" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "'name' is required." });
  });

  it("should return 400 status when Aclass is missing", async () => {
    const response = await request(app)
      .post("/amenities")
      .send({ name: "Pool" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "'Aclass' is required." });
  });

  it("should return 400 status when both name and Aclass are missing", async () => {
    const response = await request(app).post("/amenities").send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "'name' is required." });
  });

  // Boundary cases
  it("should return 400 status when name is too short", async () => {
    const response = await request(app)
      .post("/amenities")
      .send({ name: "A", Aclass: "Luxury" });

    expect(response.status).toBe(400); // Validation fails for short names
    expect(response.body).toEqual({ message: "'name' is too short." });
  });

  it("should return 400 status when name is too long", async () => {
    const longName = "A".repeat(256); // Example of a long string
    const response = await request(app)
      .post("/amenities")
      .send({ name: longName, Aclass: "Luxury" });

    expect(response.status).toBe(400); // Validation fails for long names
    expect(response.body).toEqual({ message: "'name' is too long." });
  });

  // Abnormal cases
  it("should return 400 status when name is a number instead of a string", async () => {
    const response = await request(app)
      .post("/amenities")
      .send({ name: 12345, Aclass: "Luxury" });

    expect(response.status).toBe(400); // Validation fails for non-string name
    expect(response.body).toEqual({ message: "'name' is required." });
  });

  it("should return 400 status when Aclass is a number instead of a string", async () => {
    const response = await request(app)
      .post("/amenities")
      .send({ name: "Pool", Aclass: 12345 });

    expect(response.status).toBe(400); // Validation fails for non-string Aclass
    expect(response.body).toEqual({ message: "'Aclass' is required." });
  });

  it("should return 400 status when name is an empty string", async () => {
    const response = await request(app)
      .post("/amenities")
      .send({ name: "", Aclass: "Luxury" });

    expect(response.status).toBe(400); // Validation fails for empty name
    expect(response.body).toEqual({ message: "'name' is required." });
  });

  it("should return 400 status when Aclass is an empty string", async () => {
    const response = await request(app)
      .post("/amenities")
      .send({ name: "Pool", Aclass: "" });

    expect(response.status).toBe(400); // Validation fails for empty Aclass
    expect(response.body).toEqual({ message: "'Aclass' is required." });
  });
});

describe("GET /amenities", () => {
  it("should return a list of amenities and return 200 status", async () => {
    const mockAmenities = [
      { id: 1, name: "Pool", type: "Luxury" },
      { id: 2, name: "Gym", type: "Standard" },
    ];
    Amenities.findAll.mockResolvedValue(mockAmenities);

    const response = await request(app)
      .get("/amenities")
      .query({ name: "Pool" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockAmenities);
  });

  it("should return a list of amenities filtered by type and return 200 status", async () => {
    const mockAmenities = [{ id: 1, name: "Pool", type: "Luxury" }];
    Amenities.findAll.mockResolvedValue(mockAmenities);

    const response = await request(app)
      .get("/amenities")
      .query({ type: "Luxury" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockAmenities);
    expect(Amenities.findAll).toHaveBeenCalledWith({
      where: {
        type: "Luxury",
      },
    });
  });

  it("should return 500 status when there is an error", async () => {
    Amenities.findAll.mockRejectedValue(new Error("Database error"));

    const response = await request(app)
      .get("/amenities")
      .query({ name: "Pool" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({});
  });
});

describe("GET /amenities/:id", () => {
  it("should return the details of an amenity and return 200 status", async () => {
    const mockAmenity = { id: 1, name: "Pool", type: "Luxury" };
    Amenities.findOne.mockResolvedValue(mockAmenity);

    const response = await request(app).get("/amenities/1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockAmenity);
    expect(Amenities.findOne).toHaveBeenCalledWith({
      where: {
        id: "1",
      },
    });
  });


  it("should return 404 status when the amenity is not found", async () => {
    Amenities.findOne.mockResolvedValue(null);

    const response = await request(app).get("/amenities/99");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Amenity not found." });
  });

  it("should return 500 status when there is a server error", async () => {
    Amenities.findOne.mockRejectedValue(new Error("Database error"));

    const response = await request(app).get("/amenities/1");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: "Database error",
      message: "Internal Server Error",
    });
  });
});
