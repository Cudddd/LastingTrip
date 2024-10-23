const request = require("supertest");
const express = require("express");
const { Hotels, UrlImageHotel, sequelize } = require("../models"); // Assuming you have a models file for Hotels and UrlImageHotel
const {
  createHotel,
  getAllHotel,
  getDetailHotel,
  updateHotel,
  deleteHotel,
  searchIdHotelByName,
  getAllMaps,
} = require("../controllers/hotel.controllers"); // Assuming the function is in a controller file
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

const app = express();
app.use(express.json());
app.use(multer().any());
app.post("/hotels", createHotel);
app.get("/hotels", getAllHotel);
app.get("/hotels/:id", getDetailHotel);
app.put("/updateHotel/:id", updateHotel);
app.delete("/hotels/:id", deleteHotel);
app.post("/searchHotelByName", searchIdHotelByName);
app.get("/maps", getAllMaps);

jest.mock("../models", () => ({
  Hotels: {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    destroy: jest.fn(),
  },
  UrlImageHotel: {
    create: jest.fn(),
    findAll: jest.fn(),
  },
  Room: {},
  Reviews: {},
  HotelAmenities: {},
  Amenities: {},
  sequelize: {
    query: jest.fn(),
  },
}));

jest.mock("cloudinary", () => ({
  v2: {
    uploader: {
      destroy: jest.fn(),
    },
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /hotels", () => {
  it("should create a new hotel with images and return 201 status", async () => {
    const mockHotel = {
      id: 1,
      name: "Sunrise Hotel",
      star: 5,
      map: "some-map",
      TypeHotel: "Luxury",
      payment: "Credit Card",
      ownerId: 101,
    };
    const mockFiles = [
      { path: "uploads/image1.jpg", filename: "image1.jpg" },
      { path: "uploads/image2.jpg", filename: "image2.jpg" },
    ];

    Hotels.create.mockResolvedValue(mockHotel);
    UrlImageHotel.create.mockResolvedValue({});

    const response = await request(app)
      .post("/hotels")
      .field("name", "Sunrise Hotel")
      .field("star", "5")
      .field("map", "some-map")
      .field("TypeHotel", "Luxury")
      .field("payment", "Credit Card")
      .field("ownerId", "101")
      .attach("files", Buffer.from("file content"), {
        filename: mockFiles[0].filename,
      })
      .attach("files", Buffer.from("file content"), {
        filename: mockFiles[1].filename,
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(mockHotel);
    expect(Hotels.create).toHaveBeenCalledWith({
      name: "Sunrise Hotel",
      star: "5",
      map: "some-map",
      TypeHotel: "Luxury",
      payment: "Credit Card",
      ownerId: "101",
    });
  });

  it("should return 500 status when there is an error", async () => {
    Hotels.create.mockRejectedValue(new Error("Database error"));

    const response = await request(app)
      .post("/hotels")
      .field("name", "Sunrise Hotel")
      .field("star", "5")
      .field("map", "some-map")
      .field("TypeHotel", "Luxury")
      .field("payment", "Credit Card")
      .field("ownerId", "101")
      .attach("files", Buffer.from("file content"), {
        filename: "132.jpg",
      });

    console.log(response.body);

    expect(response.status).toBe(500);
  });

  // Invalid cases

  it("should return 400 status when 'name' is missing", async () => {
    const response = await request(app)
      .post("/hotels")
      .field("star", "5")
      .field("map", "some-map")
      .field("TypeHotel", "Luxury")
      .field("payment", "Credit Card")
      .field("ownerId", "101");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "'name' is required and must be a string.",
    });
  });

  it("should return 400 status when 'star' is not a valid number", async () => {
    const response = await request(app)
      .post("/hotels")
      .field("name", "Sunrise Hotel")
      .field("star", "invalid")
      .field("map", "some-map")
      .field("TypeHotel", "Luxury")
      .field("payment", "Credit Card")
      .field("ownerId", "101");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "'star' is required and must be a number.",
    });
  });

  it("should return 400 status when 'files' are missing", async () => {
    const response = await request(app)
      .post("/hotels")
      .field("name", "Sunrise Hotel")
      .field("star", "5")
      .field("map", "some-map")
      .field("TypeHotel", "Luxury")
      .field("payment", "Credit Card")
      .field("ownerId", "101");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "At least one image file is required.",
    });
  });

  it("should return 400 status when 'ownerId' is missing or invalid", async () => {
    const response = await request(app)
      .post("/hotels")
      .field("name", "Sunrise Hotel")
      .field("star", "5")
      .field("map", "some-map")
      .field("TypeHotel", "Luxury")
      .field("payment", "Credit Card");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "'ownerId' is required and must be a valid number.",
    });
  });
});

describe("GET /hotels", () => {
  it("should return a list of hotels filtered by name and return 200 status", async () => {
    const mockHotels = [
      {
        id: 1,
        name: "Sunrise Hotel",
        star: 5,
        TypeHotel: "Luxury",
        payment: "Credit Card",
      },
      {
        id: 2,
        name: "Sunset Hotel",
        star: 4,
        TypeHotel: "Standard",
        payment: "Cash",
      },
    ];
    Hotels.findAll.mockResolvedValue(mockHotels);

    const response = await request(app)
      .get("/hotels")
      .query({ name: "Sunrise" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockHotels);
    expect(Hotels.findAll).toHaveBeenCalledWith({
      where: expect.any(Object),
      include: expect.any(Array),
      order: expect.any(Array),
    });
  });

  it("should return a list of hotels filtered by type and return 200 status", async () => {
    const mockHotels = [
      {
        id: 1,
        name: "Sunrise Hotel",
        star: 5,
        TypeHotel: "Luxury",
        payment: "Credit Card",
      },
    ];
    Hotels.findAll.mockResolvedValue(mockHotels);

    const response = await request(app)
      .get("/hotels")
      .query({ TypeHotel: "Luxury" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockHotels);
    expect(Hotels.findAll).toHaveBeenCalledWith({
      where: expect.any(Object),
      include: expect.any(Array),
      order: expect.any(Array),
    });
  });

  it("should return a list of hotels filtered by star rating and return 200 status", async () => {
    const mockHotels = [
      {
        id: 2,
        name: "Sunset Hotel",
        star: 4,
        TypeHotel: "Standard",
        payment: "Cash",
      },
    ];
    Hotels.findAll.mockResolvedValue(mockHotels);

    const response = await request(app).get("/hotels").query({ star: 4 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockHotels);
    expect(Hotels.findAll).toHaveBeenCalledWith({
      where: expect.any(Object),
      include: expect.any(Array),
      order: expect.any(Array),
    });
  });

  it("should return a list of hotels filtered by payment method and return 200 status", async () => {
    const mockHotels = [
      {
        id: 2,
        name: "Sunset Hotel",
        star: 4,
        TypeHotel: "Standard",
        payment: "Cash",
      },
    ];
    Hotels.findAll.mockResolvedValue(mockHotels);

    const response = await request(app)
      .get("/hotels")
      .query({ payment: "Cash" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockHotels);
    expect(Hotels.findAll).toHaveBeenCalledWith({
      where: expect.any(Object),
      include: expect.any(Array),
      order: expect.any(Array),
    });
  });

  it("should return a list of hotels filtered by multiple criteria and return 200 status", async () => {
    const mockHotels = [
      {
        id: 1,
        name: "Sunrise Hotel",
        star: 5,
        TypeHotel: "Luxury",
        payment: "Credit Card",
      },
    ];
    Hotels.findAll.mockResolvedValue(mockHotels);

    const response = await request(app)
      .get("/hotels")
      .query({ name: "Sunrise", star: 5, TypeHotel: "Luxury" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockHotels);
    expect(Hotels.findAll).toHaveBeenCalledWith({
      where: expect.any(Object),
      include: expect.any(Array),
      order: expect.any(Array),
    });
  });

  it("should return 500 status when there is an error", async () => {
    Hotels.findAll.mockRejectedValue(new Error("Database error"));

    const response = await request(app)
      .get("/hotels")
      .query({ name: "Sunrise" });

    expect(response.status).toBe(500);
    expect(response.text).toBe("Internal Server Error");
  });
});

describe("GET /hotels/:id", () => {
  it("should return the details of a hotel and return 200 status", async () => {
    const mockHotel = {
      id: 1,
      name: "Sunrise Hotel",
      star: 5,
      TypeHotel: "Luxury",
      Rooms: [{ id: 1, type_room: "Deluxe" }],
      HotelAmenities: [{ id: 1, Amenities: { name: "Pool" } }],
      Reviews: [{ id: 1, comment: "Great stay!" }],
      UrlImageHotels: [{ id: 1, url: "uploads/image1.jpg" }],
    };

    Hotels.findOne.mockResolvedValue(mockHotel);

    const response = await request(app).get("/hotels/1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockHotel);
    expect(Hotels.findOne).toHaveBeenCalledWith({
      where: {
        id: "1",
      },
      include: expect.any(Array),
    });
  });

  it("should return 404 status when the hotel is not found", async () => {
    Hotels.findOne.mockResolvedValue(null);

    const response = await request(app).get("/hotels/99");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Hotel not found." });
  });

  it("should return 500 status when there is a database error", async () => {
    Hotels.findOne.mockRejectedValue(new Error("Database error"));

    const response = await request(app).get("/hotels/1");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      message: "Internal Server Error",
      error: "Database error",
    });
  });
});

describe("PUT /updateHotel/:id", () => {
  it("should update an existing hotel and return 200 status", async () => {
    const mockHotel = {
      id: 1,
      name: "Sunrise Hotel",
      star: 5,
      map: "some-map",
      TypeHotel: "Luxury",
      payment: "Credit Card",
      ownerId: 101,
    };
    const updatedHotel = { ...mockHotel, name: "Updated Sunrise Hotel" };

    Hotels.findOne.mockResolvedValue(mockHotel);
    mockHotel.save = jest.fn().mockResolvedValue(updatedHotel);

    const response = await request(app)
      .put("/updateHotel/1")
      .send({ name: "Updated Sunrise Hotel" });

    expect(response.status).toBe(200);
    expect(response.body.updateHotel).toEqual(updatedHotel);
    expect(Hotels.findOne).toHaveBeenCalledWith({
      where: {
        id: "1",
      },
    });
    expect(mockHotel.save).toHaveBeenCalled();
  });

  it("should return 404 status when the hotel is not found", async () => {
    Hotels.findOne.mockResolvedValue(null);

    const response = await request(app)
      .put("/updateHotel/1")
      .send({ name: "Updated Sunrise Hotel" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      status: "error",
      message: "Hotel with id 1 not found.",
    });
  });

  it("should return 500 status when there is a database error", async () => {
    Hotels.findOne.mockRejectedValue(new Error("Database error"));

    const response = await request(app)
      .put("/updateHotel/1")
      .send({ name: "Updated Sunrise Hotel" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      message: "Internal Server Error",
      error: "Database error",
    });
  });
});

describe("DELETE /hotels/:id", () => {
  it("should delete a hotel and its images and return 200 status", async () => {
    const mockHotel = { id: 1, name: "Sunrise Hotel" };
    const mockImages = [
      { file_name: "image1.jpg", destroy: jest.fn() },
      { file_name: "image2.jpg", destroy: jest.fn() },
    ];

    Hotels.findOne.mockResolvedValue(mockHotel);
    UrlImageHotel.findAll.mockResolvedValue(mockImages);
    cloudinary.uploader.destroy.mockResolvedValue({ result: "ok" });

    const response = await request(app).delete("/hotels/1");

    expect(response.status).toBe(200);
    expect(response.text).toBe(
      "Xóa khách sạn và các hình ảnh liên quan thành công"
    );
    expect(Hotels.findOne).toHaveBeenCalledWith({ where: { id: "1" } });
    expect(UrlImageHotel.findAll).toHaveBeenCalledWith({
      where: { HotelId: "1" },
    });
    expect(cloudinary.uploader.destroy).toHaveBeenCalledTimes(2);
    expect(mockImages[0].destroy).toHaveBeenCalled();
    expect(mockImages[1].destroy).toHaveBeenCalled();
    expect(Hotels.findOne).toHaveBeenCalled();
  });

  it("should return 404 status when the hotel is not found", async () => {
    Hotels.findOne.mockResolvedValue(null);

    const response = await request(app).delete("/hotels/1");

    expect(response.status).toBe(404);
    expect(response.text).toBe("Không tìm thấy khách sạn");
  });

  it("should return 500 status when there is an error", async () => {
    Hotels.findOne.mockRejectedValue(new Error("Database error"));

    const response = await request(app).delete("/hotels/1");

    expect(response.status).toBe(500);
    expect(response.text).toBe("Lỗi máy chủ nội bộ");
  });
});

describe("POST /searchHotelByName", () => {
  it("should return the hotel ID when the hotel is found", async () => {
    const mockHotel = { id: 1, name: "Sunrise Hotel" };
    Hotels.findOne.mockResolvedValue(mockHotel);

    const response = await request(app)
      .post("/searchHotelByName")
      .send({ hotelName: "Sunrise Hotel" });

    expect(response.status).toBe(200);
    expect(response.body.hotelId).toBe(1);
    expect(Hotels.findOne).toHaveBeenCalledWith({
      where: { name: "Sunrise Hotel" },
    });
  });

  it("should return 404 if the hotel is not found", async () => {
    Hotels.findOne.mockResolvedValue(null);

    const response = await request(app)
      .post("/searchHotelByName")
      .send({ hotelName: "Nonexistent Hotel" });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Không tìm thấy khách sạn");
  });

  it("should return 400 if the hotelName is not provided", async () => {
    const response = await request(app)
      .post("/searchHotelByName")
      .send({ hotelName: "" }); // Empty hotelName

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("'hotelName' is required.");
  });

  it("should return 500 when there is a server error", async () => {
    Hotels.findOne.mockRejectedValue(new Error("Database error"));

    const response = await request(app)
      .post("/searchHotelByName")
      .send({ hotelName: "Sunrise Hotel" });

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Lỗi máy chủ nội bộ");
  });
});

describe("GET /maps", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return a list of unique districts", async () => {
    const mockHotels = [
      { map: "District 1, District 3" },
      { map: "District 2, District 1" },
      { map: "District 4, District 3" },
    ];

    sequelize.query.mockResolvedValue([mockHotels]);

    const response = await request(app).get("/maps");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      "District 1",
      "District 3",
      "District 2",
      "District 4",
    ]);
    expect(sequelize.query).toHaveBeenCalledWith("SELECT map FROM Hotels");
  });

  it("should return 500 status when there is an error", async () => {
    sequelize.query.mockRejectedValue(new Error("Database error"));

    const response = await request(app).get("/maps");

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Lỗi máy chủ nội bộ");
  });
});
