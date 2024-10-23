const request = require("supertest");
const express = require("express");
const { Booking, Room, User, Hotels } = require("../models");
const {
  createBooking,
  getAllBooking,
  getDetailBooking,
  deleteBooking,
  getAvailability,
} = require("../controllers/payment.controller");

const app = express();
app.use(express.json());

app.post("/bookings", createBooking);
app.get("/bookings", getAllBooking);
app.get("/bookings/:id", getDetailBooking);
app.delete("/bookings/:id", deleteBooking);
app.get("/availability", getAvailability);

jest.mock("../models", () => ({
  Booking: {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    destroy: jest.fn(),
    sum: jest.fn(),
  },
  Room: {
    findOne: jest.fn(),
  },
  User: {},
  Hotels: {},
}));

describe("Booking Controller Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test cases for createBooking
  describe("POST /bookings", () => {
    it("should create a booking successfully", async () => {
      const mockRoom = { id: 1, quantity: 10 };
      const mockBooking = {
        id: 1,
        room_id: 1,
        user_id: 1,
        check_in_date: "2023-11-10",
        check_out_date: "2023-11-15",
        quantity: 2,
      };

      Room.findOne.mockResolvedValue(mockRoom);
      Booking.sum.mockResolvedValue(5); // Already booked quantity
      Booking.create.mockResolvedValue(mockBooking);

      const response = await request(app).post("/bookings").send({
        room_id: 1,
        user_id: 1,
        check_in_date: "2023-11-10",
        check_out_date: "2023-11-15",
        total_price: 500,
        quantity: 2,
        full_name: "John Doe",
        hotel_id: 1,
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockBooking);
      expect(Room.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(Booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          room_id: 1,
          user_id: 1,
          total_price: 500,
        })
      );
    });

    it("should return 400 if required fields are missing", async () => {
      const response = await request(app).post("/bookings").send({
        room_id: 1,
        check_in_date: "2023-11-10",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Missing required fields" });
      expect(Booking.create).not.toHaveBeenCalled();
    });

    it("should return 400 if not enough rooms available", async () => {
      const mockRoom = { id: 1, quantity: 5 };
      Room.findOne.mockResolvedValue(mockRoom);
      Booking.sum.mockResolvedValue(5); // Already booked quantity

      const response = await request(app).post("/bookings").send({
        room_id: 1,
        user_id: 1,
        check_in_date: "2023-11-10",
        check_out_date: "2023-11-15",
        total_price: 500,
        quantity: 3, // Not enough rooms
        full_name: "John Doe",
        hotel_id: 1,
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "Not enough rooms available for the selected dates"
      );
    });
  });

  // Test cases for getAllBooking
  describe("GET /bookings", () => {
    it("should return all bookings", async () => {
      const mockBookings = [
        {
          id: 1,
          room_id: 1,
          user_id: 1,
          check_in_date: "2023-11-10",
          check_out_date: "2023-11-15",
        },
      ];

      Booking.findAll.mockResolvedValue(mockBookings);

      const response = await request(app).get("/bookings");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockBookings);
      expect(Booking.findAll).toHaveBeenCalled();
    });

    it("should return 500 if there is a server error", async () => {
      Booking.findAll.mockRejectedValue(new Error("Database error"));

      const response = await request(app).get("/bookings");

      expect(response.status).toBe(500);
    });
  });

  // Test cases for getDetailBooking
  describe("GET /bookings/:id", () => {
    it("should return booking details by ID", async () => {
      const mockBooking = {
        id: 1,
        room_id: 1,
        user_id: 1,
        check_in_date: "2023-11-10",
        check_out_date: "2023-11-15",
        Room: {
          id: 1,
          name: "Luxury Suite",
          price: 200,
        },
        User: {
          id: 1,
          name: "John Doe",
        },
      };

      Booking.findOne.mockResolvedValue(mockBooking);

      const response = await request(app).get("/bookings/1");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockBooking);
    });

    it("should return 404 if booking is not found", async () => {
      Booking.findOne.mockResolvedValue(null);

      const response = await request(app).get("/bookings/999");

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Booking not found");
    });
  });

  // Test cases for deleteBooking
  describe("DELETE /bookings/:id", () => {
    it("should delete a booking", async () => {
      Booking.destroy.mockResolvedValue(1);

      const response = await request(app).delete("/bookings/1");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Booking deleted successfully");
      expect(Booking.destroy).toHaveBeenCalledWith({ where: { id: "1" } });
    });

    it("should return 404 if booking is not found", async () => {
      Booking.destroy.mockResolvedValue(0);

      const response = await request(app).delete("/bookings/999");

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Booking not found");
    });
  });

  // Test cases for getAvailability
  describe("GET /availability", () => {
    it("should return available room quantity", async () => {
      const mockRoom = { id: 1, quantity: 10 };
      Room.findOne.mockResolvedValue(mockRoom);
      Booking.sum.mockResolvedValue(3);

      const response = await request(app).get("/availability").query({
        checkInDate: "2023-11-10",
        checkOutDate: "2023-11-15",
        roomId: 1,
        quantity: 5,
      });

      expect(response.status).toBe(200);
      expect(response.body.availableQuantity).toBe(7); // 10 - 3
    });

    it("should return 400 if required fields are missing", async () => {
      const response = await request(app).get("/availability").query({
        checkOutDate: "2023-11-15",
        roomId: 1,
        quantity: 5,
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Missing required fields");
    });
  });
});
