const request = require("supertest");
const express = require("express");

const { roomService, Amenities, Room } = require("../models");
const {
  getroomService,
  getService,
  getRoomHaveAmenities,
  searchRoomsByAmenities,
  addRoomAmenity,
  updateRoomAmenity,
  deleteRoomAmenity,
} = require("../controllers/room_service.controller");

const app = express();
app.use(express.json());

app.get("/rooms/:roomId/services", getroomService);
app.get("/service/:id", getService);
app.get("/roomAmenities/:serviceId", getRoomHaveAmenities);
app.post("/rooms/amenities", searchRoomsByAmenities);
app.post("/roomAmenities", addRoomAmenity);
app.put("/roomAmenities/:id", updateRoomAmenity);
app.delete("/roomAmenities/:id", deleteRoomAmenity);

jest.mock("../models", () => ({
  roomService: {
    findAll: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn(),
  },
  Amenities: jest.fn(),
  Room: jest.fn(),
}));

describe("GET /rooms/:roomId/services", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Normal Case: Successfully returning room services with amenities
  it("should return a list of room services with amenities", async () => {
    const mockRoomServices = [
      {
        id: 1,
        roomId: 1,
        serviceName: "Daily Cleaning",
        Amenities: { id: 1, name: "Free Wi-Fi" },
      },
      {
        id: 2,
        roomId: 1,
        serviceName: "Laundry Service",
        Amenities: { id: 2, name: "Pool Access" },
      },
    ];

    roomService.findAll.mockResolvedValue(mockRoomServices);

    const response = await request(app).get("/rooms/1/services");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockRoomServices);
    expect(roomService.findAll).toHaveBeenCalledWith({
      where: { roomId: "1" },
      include: [{ model: Amenities }],
    });
  });

  // Normal Case: No services found, should return an empty array
  it("should return an empty array if no room services are found", async () => {
    roomService.findAll.mockResolvedValue([]);

    const response = await request(app).get("/rooms/1/services");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
    expect(roomService.findAll).toHaveBeenCalledWith({
      where: { roomId: "1" },
      include: [{ model: Amenities }],
    });
  });

  // Error Case: Server error occurs while fetching services
  it("should return 500 status when there is an error", async () => {
    roomService.findAll.mockRejectedValue(new Error("Database error"));

    const response = await request(app).get("/rooms/1/services");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Internal Server Error" });
    expect(roomService.findAll).toHaveBeenCalledWith({
      where: { roomId: "1" },
      include: [{ model: Amenities }],
    });
  });

  // Validation Case: Invalid roomId (non-numeric)
  it("should return 400 status when roomId is invalid (non-numeric)", async () => {
    const response = await request(app).get("/rooms/abc/services");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "'roomId' is required and must be a valid number.",
    });
  });
});

describe("GET /service/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return room service details when given a valid service ID", async () => {
    const mockService = [
      {
        id: 1,
        serviceName: "Daily Cleaning",
        description: "Provides daily cleaning for the room",
      },
    ];

    roomService.findAll.mockResolvedValue(mockService);

    const response = await request(app).get("/service/1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockService);
    expect(roomService.findAll).toHaveBeenCalledWith({
      where: { id: "1" },
    });
  });

  it("should return 500 if there is a server error", async () => {
    roomService.findAll.mockRejectedValue(new Error("Database error"));

    const response = await request(app).get("/service/1");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Internal Server Error" });
    expect(roomService.findAll).toHaveBeenCalledWith({
      where: { id: "1" },
    });
  });
});

describe("GET /roomAmenities/:serviceId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return rooms with amenities when given a valid service ID", async () => {
    const mockRoomService = [
      {
        id: 1,
        serviceId: 1,
        Room: {
          id: 1,
          name: "Luxury Room",
        },
      },
      {
        id: 2,
        serviceId: 1,
        Room: {
          id: 2,
          name: "Deluxe Room",
        },
      },
    ];

    roomService.findAll.mockResolvedValue(mockRoomService);

    const response = await request(app).get("/roomAmenities/1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockRoomService);
    expect(roomService.findAll).toHaveBeenCalledWith({
      where: { serviceId: "1" },
      include: [{ model: Room }],
    });
  });

  it("should return an empty array if no rooms are found for the given service ID", async () => {
    roomService.findAll.mockResolvedValue([]);

    const response = await request(app).get("/roomAmenities/999");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
    expect(roomService.findAll).toHaveBeenCalledWith({
      where: { serviceId: "999" },
      include: [{ model: Room }],
    });
  });

  it("should return 500 status when there is a server error", async () => {
    roomService.findAll.mockRejectedValue(new Error("Database error"));

    const response = await request(app).get("/roomAmenities/1");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Internal Server Error" });
    expect(roomService.findAll).toHaveBeenCalledWith({
      where: { serviceId: "1" },
      include: [{ model: Room }],
    });
  });
});

describe("POST /rooms/amenities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Normal Case: Successfully returning rooms matching the selected amenities
  it("should return rooms matching the selected amenities", async () => {
    const mockRoomService = [
      {
        id: 1,
        serviceId: 1,
        Room: {
          id: 1,
          name: "Luxury Room",
        },
      },
      {
        id: 2,
        serviceId: 1,
        Room: {
          id: 2,
          name: "Deluxe Room",
        },
      },
    ];

    roomService.findAll.mockResolvedValue(mockRoomService);

    const response = await request(app)
      .post("/rooms/amenities")
      .send({ amenities: [1, 2] });

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: 1, name: "Luxury Room" },
      { id: 2, name: "Deluxe Room" },
    ]);

    expect(roomService.findAll).toHaveBeenCalledWith({
      where: {
        serviceId: [1, 2],
      },
      include: [{ model: Room }],
    });
  });

  // Normal Case: No rooms found for selected amenities
  it("should return an empty array if no rooms are found for the selected amenities", async () => {
    roomService.findAll.mockResolvedValue([]);

    const response = await request(app)
      .post("/rooms/amenities")
      .send({ amenities: [1, 2] });

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
    expect(roomService.findAll).toHaveBeenCalledWith({
      where: {
        serviceId: [1, 2],
      },
      include: [{ model: Room }],
    });
  });

  // Error Case: Server error during the search
  it("should return 500 status when there is an error", async () => {
    roomService.findAll.mockRejectedValue(new Error("Database error"));

    const response = await request(app)
      .post("/rooms/amenities")
      .send({ amenities: [1, 2] });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Internal Server Error" });
    expect(roomService.findAll).toHaveBeenCalledWith({
      where: {
        serviceId: [1, 2],
      },
      include: [{ model: Room }],
    });
  });

  // Validation Case: Missing amenities in the request body
  it("should return 400 status when amenities are not provided", async () => {
    const response = await request(app).post("/rooms/amenities").send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "'amenities' is required and must be a non-empty array.",
    });
  });

  // Validation Case: Amenities are not an array
  it("should return 400 status when amenities are not an array", async () => {
    const response = await request(app)
      .post("/rooms/amenities")
      .send({ amenities: "invalid" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "'amenities' is required and must be a non-empty array.",
    });
  });

  // Validation Case: Amenities array is empty
  it("should return 400 status when amenities array is empty", async () => {
    const response = await request(app)
      .post("/rooms/amenities")
      .send({ amenities: [] });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "'amenities' is required and must be a non-empty array.",
    });
  });
});

describe("POST /roomAmenities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Normal Case: Successfully create room amenity
  it("should create a new room amenity and return 201 status", async () => {
    const mockRoomAmenity = {
      id: 1,
      roomId: 101,
      serviceId: 202,
    };

    roomService.create.mockResolvedValue(mockRoomAmenity);

    const response = await request(app).post("/roomAmenities").send({
      roomId: 101,
      serviceId: 202,
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(mockRoomAmenity);

    expect(roomService.create).toHaveBeenCalledWith({
      roomId: 101,
      serviceId: 202,
    });
  });

  // Error Case: Server/database error during creation
  it("should return 500 status when there is an error", async () => {
    roomService.create.mockRejectedValue(new Error("Database error"));

    const response = await request(app).post("/roomAmenities").send({
      roomId: 101,
      serviceId: 202,
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Internal Server Error" });

    expect(roomService.create).toHaveBeenCalledWith({
      roomId: 101,
      serviceId: 202,
    });
  });

  // Validation Case: Missing `roomId`
  it("should return 400 if roomId is missing", async () => {
    const response = await request(app).post("/roomAmenities").send({
      serviceId: 202,
    }); // Missing roomId

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "'roomId' is required and must be a valid number.",
    });

    expect(roomService.create).not.toHaveBeenCalled();
  });

  // Validation Case: Missing `serviceId`
  it("should return 400 if serviceId is missing", async () => {
    const response = await request(app).post("/roomAmenities").send({
      roomId: 101,
    }); // Missing serviceId

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "'serviceId' is required and must be a valid number.",
    });

    expect(roomService.create).not.toHaveBeenCalled();
  });

  // Validation Case: Invalid `roomId` (non-numeric)
  it("should return 400 if roomId is not a valid number", async () => {
    const response = await request(app).post("/roomAmenities").send({
      roomId: "invalid", // Invalid roomId
      serviceId: 202,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "'roomId' is required and must be a valid number.",
    });

    expect(roomService.create).not.toHaveBeenCalled();
  });

  // Validation Case: Invalid `serviceId` (non-numeric)
  it("should return 400 if serviceId is not a valid number", async () => {
    const response = await request(app).post("/roomAmenities").send({
      roomId: 101,
      serviceId: "invalid", // Invalid serviceId
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "'serviceId' is required and must be a valid number.",
    });

    expect(roomService.create).not.toHaveBeenCalled();
  });
});

describe("PUT /roomAmenities/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update a room amenity and return the updated data", async () => {
    const mockRoomAmenity = {
      id: 1,
      roomId: 101,
      serviceId: 202,
      save: jest.fn().mockResolvedValue(),
    };

    roomService.findByPk.mockResolvedValue(mockRoomAmenity);

    const response = await request(app).put("/roomAmenities/1").send({
      roomId: 303,
      serviceId: 404,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 1,
      roomId: 303,
      serviceId: 404,
    });

    expect(roomService.findByPk).toHaveBeenCalledWith("1");
    expect(mockRoomAmenity.save).toHaveBeenCalled();
  });

  it("should return 404 if the room amenity is not found", async () => {
    roomService.findByPk.mockResolvedValue(null);

    const response = await request(app).put("/roomAmenities/999").send({
      roomId: 303,
      serviceId: 404,
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Room amenity not found" });

    expect(roomService.findByPk).toHaveBeenCalledWith("999");
  });

  it("should return 400 if roomId is missing", async () => {
    const response = await request(app).put("/roomAmenities/1").send({
      serviceId: 404,
    }); // Missing roomId

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "'roomId' is required and must be a valid number.",
    });

    expect(roomService.findByPk).not.toHaveBeenCalled();
  });

  it("should return 400 if serviceId is missing", async () => {
    const response = await request(app).put("/roomAmenities/1").send({
      roomId: 303,
    }); // Missing serviceId

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "'serviceId' is required and must be a valid number.",
    });

    expect(roomService.findByPk).not.toHaveBeenCalled();
  });

  it("should return 400 if roomId is not a valid number", async () => {
    const response = await request(app).put("/roomAmenities/1").send({
      roomId: "invalid", // Invalid roomId
      serviceId: 404,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "'roomId' is required and must be a valid number.",
    });

    expect(roomService.findByPk).not.toHaveBeenCalled();
  });

  it("should return 400 if serviceId is not a valid number", async () => {
    const response = await request(app).put("/roomAmenities/1").send({
      roomId: 303,
      serviceId: "invalid", // Invalid serviceId
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "'serviceId' is required and must be a valid number.",
    });

    expect(roomService.findByPk).not.toHaveBeenCalled();
  });

  it("should return 500 status when there is a server error", async () => {
    roomService.findByPk.mockRejectedValue(new Error("Database error"));

    const response = await request(app).put("/roomAmenities/1").send({
      roomId: 303,
      serviceId: 404,
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Internal Server Error" });

    expect(roomService.findByPk).toHaveBeenCalledWith("1");
  });
});

describe("DELETE /roomAmenities/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should delete a room amenity and return success message", async () => {
    const mockRoomAmenity = {
      id: 1,
      roomId: 101,
      serviceId: 202,
      destroy: jest.fn().mockResolvedValue(),
    };

    roomService.findByPk.mockResolvedValue(mockRoomAmenity);

    const response = await request(app).delete("/roomAmenities/1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Room amenity deleted successfully",
    });

    expect(roomService.findByPk).toHaveBeenCalledWith("1");
    expect(mockRoomAmenity.destroy).toHaveBeenCalled();
  });

  it("should return 404 if the room amenity is not found", async () => {
    roomService.findByPk.mockResolvedValue(null);

    const response = await request(app).delete("/roomAmenities/999");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Room amenity not found" });

    expect(roomService.findByPk).toHaveBeenCalledWith("999");
  });

  it("should return 500 status when there is an error", async () => {
    roomService.findByPk.mockRejectedValue(new Error("Database error"));

    const response = await request(app).delete("/roomAmenities/1");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Internal Server Error" });

    expect(roomService.findByPk).toHaveBeenCalledWith("1");
  });
});
