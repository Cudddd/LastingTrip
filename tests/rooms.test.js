const request = require("supertest");
const express = require("express");
const multer = require("multer");

const { Room, UrlImageRoom } = require("../models");
const {
  createRoom,
  getAllRoom,
  getDetailRoom,
  updateRoom,
  deleteRoom,
} = require("../controllers/room.controller");
const cloudinary = require("cloudinary").v2;

const app = express();
app.use(express.json());
app.use(multer().any());

app.post("/rooms", createRoom);
app.get("/rooms", getAllRoom);
app.get("/rooms/:id", getDetailRoom);
app.put("/rooms/:id", updateRoom); // Add route for updateRoom
app.delete("/rooms/:id", deleteRoom);

jest.mock("../models", () => ({
  Room: {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  },
  UrlImageRoom: {
    create: jest.fn(),
    findAll: jest.fn(),
  },
  Hotels: {},
  roomService: {},
  Amenities: {},
}));

jest.mock("cloudinary", () => ({
  v2: {
    uploader: {
      destroy: jest.fn(),
    },
  },
}));

describe("POST /rooms", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create a new room and associated image records, returning 201 status", async () => {
    const mockRoom = {
      id: 1,
      name: "Luxury Room",
      status: "available",
      price: 200,
      quantity: 5,
      quantity_people: 2,
      hotelId: 1,
      type_bed: "King",
    };

    Room.create.mockResolvedValue(mockRoom);

    UrlImageRoom.create.mockResolvedValue({});

    const mockFiles = [
      { path: "uploads/room1.jpg", filename: "room1.jpg" },
      { path: "uploads/room2.jpg", filename: "room2.jpg" },
    ];

    const response = await request(app)
      .post("/rooms")
      .field("name", "Luxury Room")
      .field("status", "available")
      .field("price", "200")
      .field("quantity", "5")
      .field("quantity_people", "2")
      .field("hotelId", "1")
      .field("type_bed", "King")
      .attach("files", Buffer.from("file content"), {
        filename: mockFiles[0].filename,
      })
      .attach("files", Buffer.from("file content"), {
        filename: mockFiles[1].filename,
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(mockRoom);

    expect(Room.create).toHaveBeenCalledWith({
      name: "Luxury Room",
      status: "available",
      price: "200",
      quantity: "5",
      quantity_people: "2",
      hotelId: "1",
      type_bed: "King",
    });

    expect(UrlImageRoom.create).toHaveBeenCalledTimes(2);
  });

  // Missing required fields
  it("should return 400 status if 'name' is missing", async () => {
    const response = await request(app)
      .post("/rooms")
      .field("status", "available")
      .field("price", "200")
      .field("quantity", "5")
      .field("quantity_people", "2")
      .field("hotelId", "1")
      .field("type_bed", "King");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "All fields are required." });

    expect(Room.create).not.toHaveBeenCalled();
  });

  it("should return 400 status if 'status' is missing", async () => {
    const response = await request(app)
      .post("/rooms")
      .field("name", "Luxury Room")
      .field("price", "200")
      .field("quantity", "5")
      .field("quantity_people", "2")
      .field("hotelId", "1")
      .field("type_bed", "King");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "All fields are required." });

    expect(Room.create).not.toHaveBeenCalled();
  });

  it("should return 400 status if 'price' is missing", async () => {
    const response = await request(app)
      .post("/rooms")
      .field("name", "Luxury Room")
      .field("status", "available")
      .field("quantity", "5")
      .field("quantity_people", "2")
      .field("hotelId", "1")
      .field("type_bed", "King");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "All fields are required." });

    expect(Room.create).not.toHaveBeenCalled();
  });

  // Invalid numeric fields
  it("should return 400 status if numeric fields are invalid", async () => {
    const response = await request(app)
      .post("/rooms")
      .field("name", "Luxury Room")
      .field("status", "available")
      .field("price", "invalid-price") // Invalid price
      .field("quantity", "5")
      .field("quantity_people", "2")
      .field("hotelId", "1")
      .field("type_bed", "King");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message:
        "'price', 'quantity', 'quantity_people', and 'hotelId' must be valid numbers.",
    });

    expect(Room.create).not.toHaveBeenCalled();
  });

  it("should return 400 status if 'quantity' is invalid", async () => {
    const response = await request(app)
      .post("/rooms")
      .field("name", "Luxury Room")
      .field("status", "available")
      .field("price", "200")
      .field("quantity", "invalid-quantity") // Invalid quantity
      .field("quantity_people", "2")
      .field("hotelId", "1")
      .field("type_bed", "King");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message:
        "'price', 'quantity', 'quantity_people', and 'hotelId' must be valid numbers.",
    });

    expect(Room.create).not.toHaveBeenCalled();
  });

  it("should return 400 status if 'quantity_people' is invalid", async () => {
    const response = await request(app)
      .post("/rooms")
      .field("name", "Luxury Room")
      .field("status", "available")
      .field("price", "200")
      .field("quantity", "5")
      .field("quantity_people", "invalid-people") // Invalid quantity_people
      .field("hotelId", "1")
      .field("type_bed", "King");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message:
        "'price', 'quantity', 'quantity_people', and 'hotelId' must be valid numbers.",
    });

    expect(Room.create).not.toHaveBeenCalled();
  });

  // Error case
  it("should return 500 status when there is an error creating the room", async () => {
    Room.create.mockRejectedValue(new Error("Database error"));

    const response = await request(app)
      .post("/rooms")
      .field("name", "Luxury Room")
      .field("status", "available")
      .field("price", "200")
      .field("quantity", "5")
      .field("quantity_people", "2")
      .field("hotelId", "1")
      .field("type_bed", "King");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: "Failed to create room",
      message: "Database error",
    });

    expect(Room.create).toHaveBeenCalled();
  });
});

describe("GET /rooms", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return a list of rooms, including hotel and service info", async () => {
    const mockRooms = [
      {
        id: 1,
        name: "Luxury Room",
        price: 200,
        hotelId: 1,
        Hotel: { id: 1, name: "Sunrise Hotel" },
        roomService: [
          {
            id: 1,
            Amenities: {
              id: 1,
              name: "Free Wi-Fi",
            },
          },
        ],
        UrlImageRooms: [{ id: 1, url: "uploads/room1.jpg" }],
      },
      {
        id: 2,
        name: "Standard Room",
        price: 100,
        hotelId: 2,
        Hotel: { id: 2, name: "Sunset Hotel" },
        roomService: [
          {
            id: 2,
            Amenities: {
              id: 2,
              name: "TV",
            },
          },
        ],
        UrlImageRooms: [{ id: 2, url: "uploads/room2.jpg" }],
      },
    ];

    Room.findAll.mockResolvedValue(mockRooms);

    const response = await request(app).get("/rooms");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockRooms);
  });

  it("should return rooms filtered by hotelId when provided", async () => {
    const mockRooms = [
      {
        id: 1,
        name: "Luxury Room",
        price: 200,
        hotelId: 1,
        Hotel: { id: 1, name: "Sunrise Hotel" },
        roomService: [
          {
            id: 1,
            Amenities: {
              id: 1,
              name: "Free Wi-Fi",
            },
          },
        ],
        UrlImageRooms: [{ id: 1, url: "uploads/room1.jpg" }],
      },
    ];

    Room.findAll.mockResolvedValue(mockRooms);

    const response = await request(app).get("/rooms").query({ hotelId: 1 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockRooms);
    expect(Room.findAll).toHaveBeenCalledWith({
      where: { hotelId: "1" },
      include: expect.any(Array),
    });
  });

  it("should return 400 status when hotelId is not a valid number", async () => {
    const response = await request(app)
      .get("/rooms")
      .query({ hotelId: "invalid" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "'hotelId' must be a valid number.",
    });
  });

  it("should return 404 status when no rooms are found", async () => {
    Room.findAll.mockResolvedValue([]);

    const response = await request(app).get("/rooms").query({ hotelId: 1 });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "No rooms found." });
  });

  it("should return 500 status when there is a server error", async () => {
    Room.findAll.mockRejectedValue(new Error("Database error"));

    const response = await request(app).get("/rooms");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      message: "Internal server error",
      error: "Database error",
    });
  });
});

describe("GET /rooms/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return room details when given a valid room ID", async () => {
    const mockRoom = {
      id: 1,
      name: "Luxury Room",
      price: 200,
      quantity: 5,
      quantity_people: 2,
      hotelId: 1,
      type_bed: "King",
    };

    Room.findOne.mockResolvedValue(mockRoom);

    const response = await request(app).get("/rooms/1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockRoom);
    expect(Room.findOne).toHaveBeenCalledWith({
      where: { id: "1" },
    });
  });

  it("should return 404 status when room is not found", async () => {
    Room.findOne.mockResolvedValue(null);

    const response = await request(app).get("/rooms/99");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Room not found." });
  });

  it("should return 500 status when there is a server error", async () => {
    Room.findOne.mockRejectedValue(new Error("Database error"));

    const response = await request(app).get("/rooms/1");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      message: "Internal server error",
      error: "Database error",
    });
  });
});

describe("PUT /rooms/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update the room details and return the updated room", async () => {
    const mockRoom = {
      id: 1,
      name: "Luxury Room",
      status: "available",
      price: 200,
      quantity: 5,
      quantity_people: 2,
      type_bed: "King",
      save: jest.fn().mockResolvedValue(),
    };

    Room.findOne.mockResolvedValue(mockRoom);

    const response = await request(app).put("/rooms/1").send({
      name: "Updated Room",
      status: "unavailable",
      price: 300,
      quantity: 10,
      quantity_people: 4,
      type_bed: "Queen",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 1,
      name: "Updated Room",
      status: "unavailable",
      price: 300,
      quantity: 10,
      quantity_people: 4,
      type_bed: "Queen",
    });

    expect(Room.findOne).toHaveBeenCalledWith({
      where: { id: "1" },
    });
    expect(mockRoom.save).toHaveBeenCalled();
  });

  it("should return 400 status when any required field is missing", async () => {
    const response = await request(app).put("/rooms/1").send({
      status: "unavailable",
      price: 300,
      quantity: 10,
      quantity_people: 4,
      type_bed: "Queen",
    }); // Missing 'name'

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "All fields are required." });
  });

  it("should return 400 status when numeric fields are invalid", async () => {
    const response = await request(app).put("/rooms/1").send({
      name: "Updated Room",
      status: "unavailable",
      price: "invalid_price", // Invalid price
      quantity: 10,
      quantity_people: 4,
      type_bed: "Queen",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message:
        "'price', 'quantity', and 'quantity_people' must be valid numbers.",
    });
  });

  it("should return 404 status when the room is not found", async () => {
    Room.findOne.mockResolvedValue(null);

    const response = await request(app).put("/rooms/99").send({
      name: "Updated Room",
      status: "unavailable",
      price: 300,
      quantity: 10,
      quantity_people: 4,
      type_bed: "Queen",
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Room not found." });
  });

  it("should return 500 status when there is a server error", async () => {
    Room.findOne.mockRejectedValue(new Error("Database error"));

    const response = await request(app).put("/rooms/1").send({
      name: "Updated Room",
      status: "unavailable",
      price: 300,
      quantity: 10,
      quantity_people: 4,
      type_bed: "Queen",
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      message: "Internal server error",
      error: "Database error",
    });
  });
});

describe("DELETE /rooms/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should delete a room and its associated images successfully", async () => {
    const mockRoom = { id: 1, destroy: jest.fn() };
    const mockImages = [
      { file_name: "image1.jpg", destroy: jest.fn() },
      { file_name: "image2.jpg", destroy: jest.fn() },
    ];

    Room.findOne.mockResolvedValue(mockRoom);
    UrlImageRoom.findAll.mockResolvedValue(mockImages);
    cloudinary.uploader.destroy.mockResolvedValue({ result: "ok" });

    const response = await request(app).delete("/rooms/1");

    expect(response.status).toBe(200);
    expect(response.text).toBe(
      "Xóa khách sạn và các hình ảnh liên quan thành công"
    );

    // Check that the room and its images were found and deleted
    expect(Room.findOne).toHaveBeenCalledWith({ where: { id: "1" } });
    expect(UrlImageRoom.findAll).toHaveBeenCalledWith({
      where: { IdRoom: "1" },
    });
    expect(cloudinary.uploader.destroy).toHaveBeenCalledTimes(2); // 2 images
    expect(mockImages[0].destroy).toHaveBeenCalled();
    expect(mockImages[1].destroy).toHaveBeenCalled();
    expect(mockRoom.destroy).toHaveBeenCalled();
  });

  it("should return 404 if the room is not found", async () => {
    Room.findOne.mockResolvedValue(null);

    const response = await request(app).delete("/rooms/1");

    expect(response.status).toBe(404);
    expect(response.text).toBe("Không tìm thấy khách sạn");

    expect(Room.findOne).toHaveBeenCalledWith({ where: { id: "1" } });
  });

  it("should return 500 if there is an error during deletion", async () => {
    Room.findOne.mockRejectedValue(new Error("Database error"));

    const response = await request(app).delete("/rooms/1");

    expect(response.status).toBe(500);
    expect(response.text).toBe("Lỗi máy chủ nội bộ");

    expect(Room.findOne).toHaveBeenCalledWith({ where: { id: "1" } });
  });
});
