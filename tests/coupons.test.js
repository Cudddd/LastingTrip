const request = require("supertest");
const express = require("express");

const { Coupons } = require("../models");
const {
  create,
  getAllCoupon,
  displayCoupon,
  editCoupon,
  deleteCoupon,
  getDetailCoupon,
  getCouponByCode,
} = require("../controllers/coupons.controllers");

const app = express();
app.use(express.json());
app.post("/coupons", create);
app.get("/coupons", getAllCoupon);
app.get("/displayCoupons", displayCoupon);
app.put("/coupons/:id", editCoupon);
app.delete("/coupons/:id", deleteCoupon);
app.get("/coupons-detail/:id", getDetailCoupon);
app.get("/get-coupons-by-code/:code", getCouponByCode);

jest.mock("../models", () => ({
  Coupons: {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    destroy: jest.fn(),
  },
}));

describe("POST /coupons", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Normal Case: Successfully creating a coupon
  it("should create a coupon successfully", async () => {
    const mockCoupon = {
      id: 1,
      code: "SAVE10",
      percent: 10,
      begin: "2023-10-12",
      end: "2023-12-12",
    };

    Coupons.create.mockResolvedValue(mockCoupon);

    const response = await request(app).post("/coupons").send({
      code: "SAVE10",
      percent: 10,
      begin: "2023-10-12",
      end: "2023-12-12",
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(mockCoupon);
    expect(Coupons.create).toHaveBeenCalledWith({
      code: "SAVE10",
      percent: 10,
      begin: "2023-10-12",
      end: "2023-12-12",
    });
  });

  // Validation Case: Missing `code`
  it("should return 400 if 'code' is missing", async () => {
    const response = await request(app).post("/coupons").send({
      percent: 10,
      begin: "2023-10-12",
      end: "2023-12-12",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "'code' is required and must not be null.",
    });
    expect(Coupons.create).not.toHaveBeenCalled();
  });

  // Validation Case: Invalid `percent`
  it("should return 400 if 'percent' is not a number between 1 and 100", async () => {
    const response = await request(app).post("/coupons").send({
      code: "SAVE10",
      percent: 150, // Invalid percent
      begin: "2023-10-12",
      end: "2023-12-12",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "'percent' must be a number between 1 and 100.",
    });
    expect(Coupons.create).not.toHaveBeenCalled();
  });

  // Validation Case: Invalid date format
  it("should return 400 if 'begin' and 'end' are invalid dates", async () => {
    const response = await request(app).post("/coupons").send({
      code: "SAVE10",
      percent: 10,
      begin: "invalid-date",
      end: "invalid-date",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "'begin' and 'end' must be valid dates.",
    });
    expect(Coupons.create).not.toHaveBeenCalled();
  });

  // Validation Case: 'begin' is after 'end'
  it("should return 400 if 'begin' date is after 'end' date", async () => {
    const response = await request(app).post("/coupons").send({
      code: "SAVE10",
      percent: 10,
      begin: "2023-12-12",
      end: "2023-10-12",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: "'begin' date must be before 'end' date.",
    });
    expect(Coupons.create).not.toHaveBeenCalled();
  });

  // Error Case: Server/database error
  it("should return 500 if there is a server error", async () => {
    Coupons.create.mockRejectedValue(new Error("Database error"));

    const response = await request(app).post("/coupons").send({
      code: "SAVE10",
      percent: 10,
      begin: "2023-10-12",
      end: "2023-12-12",
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: "Internal Server Error",
    });
  });
});

describe("GET /coupons", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Normal Case: Successfully fetching all coupons
  it("should return all coupons successfully", async () => {
    const mockCoupons = [
      {
        id: 1,
        code: "SAVE10",
        percent: 10,
        begin: "2023-10-12",
        end: "2023-12-12",
      },
      {
        id: 2,
        code: "DISCOUNT20",
        percent: 20,
        begin: "2023-11-01",
        end: "2023-12-01",
      },
    ];

    Coupons.findAll.mockResolvedValue(mockCoupons);

    const response = await request(app).get("/coupons");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockCoupons);
    expect(Coupons.findAll).toHaveBeenCalled();
  });

  // Error Case: Server/database error
  it("should return 500 if there is a server error", async () => {
    Coupons.findAll.mockRejectedValue(new Error("Database error"));

    const response = await request(app).get("/coupons");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Internal Server Error" });
  });
});

describe("GET /displayCoupons", () => {
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
  it("should fetch coupons and pass them to res.render", async () => {
    const mockCoupons = [
      {
        id: 1,
        code: "SAVE10",
        percent: 10,
        begin: "2023-10-12",
        end: "2023-12-12",
      },
      {
        id: 2,
        code: "DISCOUNT20",
        percent: 20,
        begin: "2023-11-01",
        end: "2023-12-01",
      },
    ];

    Coupons.findAll.mockResolvedValue(mockCoupons);

    await displayCoupon({}, res);

    // Check if findAll is called once
    expect(Coupons.findAll).toHaveBeenCalledTimes(1);

    // Check if res.render is called with the correct arguments
    expect(res.render).toHaveBeenCalledWith("coupons", {
      datatable: mockCoupons,
    });
  });

  // Error Case: Handling internal server error
  it("should return 500 and error message if findAll fails", async () => {
    Coupons.findAll.mockRejectedValue(new Error("Database error"));

    await displayCoupon({}, res);

    // Check if the response status is set to 500
    expect(res.status).toHaveBeenCalledWith(500);

    // Check if the correct error message is sent
    expect(res.send).toHaveBeenCalledWith("Internal Server Error");

    // Ensure render is not called
    expect(res.render).not.toHaveBeenCalled();
  });
});

describe("PUT /coupons/:id", () => {
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Normal Case: Successfully updating a coupon
  it("should update a coupon successfully", async () => {
    const mockCoupon = {
      id: 1,
      code: "SAVE10",
      percent: 10,
      start: "2023-10-12",
      end: "2023-12-12",
      save: jest.fn().mockResolvedValue(true),
    };

    Coupons.findOne.mockResolvedValue(mockCoupon);

    const response = await request(app).put("/coupons/1").send({
      code: "DISCOUNT20",
      percent: 20,
      start: "2023-11-01",
      end: "2023-12-01",
    });

    expect(response.status).toBe(200);
    expect(response.body.updateCoupon).toEqual(true);
    expect(Coupons.findOne).toHaveBeenCalledWith({ where: { id: "1" } });
    expect(mockCoupon.save).toHaveBeenCalled();
  });

  // Validation Case: Invalid percent
  it("should return 400 if 'percent' is invalid", async () => {
    const response = await request(app).put("/coupons/1").send({
      percent: 150,
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "'percent' must be a number between 1 and 100."
    );
    expect(Coupons.findOne).not.toHaveBeenCalled();
  });

  // Validation Case: Invalid start date
  it("should return 400 if 'start' date is invalid", async () => {
    const response = await request(app).put("/coupons/1").send({
      start: "invalid-date",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("'start' must be a valid date.");
    expect(Coupons.findOne).not.toHaveBeenCalled();
  });

  // Validation Case: start date after end date
  it("should return 400 if 'start' date is after 'end' date", async () => {
    const response = await request(app).put("/coupons/1").send({
      start: "2023-12-12",
      end: "2023-10-12",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("'start' date must be before 'end' date.");
    expect(Coupons.findOne).not.toHaveBeenCalled();
  });

  // Error Case: Coupon not found
  it("should return 404 if the coupon is not found", async () => {
    Coupons.findOne.mockResolvedValue(null);

    const response = await request(app).put("/coupons/999").send({
      code: "SAVE10",
    });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Coupon with id 999 not found");
  });

  // Error Case: Server error during update
  it("should return 500 if there is a server error", async () => {
    Coupons.findOne.mockRejectedValue(new Error("Database error"));

    const response = await request(app).put("/coupons/1").send({
      code: "SAVE10",
    });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Internal Server Error");
  });
});

describe("DELETE /coupons/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Normal Case: Successfully deleting a coupon
  it("should delete a coupon successfully", async () => {
    Coupons.destroy.mockResolvedValue(1); // Mock that one record is deleted

    const response = await request(app).delete("/coupons/1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Coupon deleted successfully" });
    expect(Coupons.destroy).toHaveBeenCalledWith({ where: { id: "1" } });
  });

  // Error Case: No coupon found to delete (destroy returns 0)
  it("should return 404 if no coupon is found to delete", async () => {
    Coupons.destroy.mockResolvedValue(0); // Mock that no record is deleted

    const response = await request(app).delete("/coupons/999");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Coupon not found" });
    expect(Coupons.destroy).toHaveBeenCalledWith({ where: { id: "999" } });
  });

  // Error Case: Server error during deletion
  it("should return 500 if there is a server error", async () => {
    Coupons.destroy.mockRejectedValue(new Error("Database error"));

    const response = await request(app).delete("/coupons/1");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Internal Server Error" });
  });
});

describe("GET /coupons-detail/:id", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Normal Case: Successfully fetching a coupon detail
  it("should fetch a coupon successfully", async () => {
    const mockCoupon = {
      id: 1,
      code: "SAVE10",
      percent: 10,
      start: "2023-10-12",
      end: "2023-12-12",
    };

    Coupons.findOne.mockResolvedValue(mockCoupon);

    const response = await request(app).get("/coupons-detail/1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockCoupon);
    expect(Coupons.findOne).toHaveBeenCalledWith({ where: { id: "1" } });
  });

  // Error Case: Coupon not found
  it("should return 404 if the coupon is not found", async () => {
    Coupons.findOne.mockResolvedValue(null);

    const response = await request(app).get("/coupons-detail/999");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: "Coupon not found",
    });
  });

  // Error Case: Server error during fetching coupon details
  it("should return 500 if there is a server error", async () => {
    Coupons.findOne.mockRejectedValue(new Error("Database error"));

    const response = await request(app).get("/coupons-detail/1");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: "Internal Server Error",
    });
  });
});

describe("GET /get-coupons-by-code/:code", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Normal Case: Successfully fetching a coupon by code
  it("should fetch a coupon successfully by code", async () => {
    const mockCoupon = {
      id: 1,
      code: "SAVE10",
      percent: 10,
      start: "2023-10-12",
      end: "2023-12-12",
    };

    Coupons.findOne.mockResolvedValue(mockCoupon);

    const response = await request(app).get("/get-coupons-by-code/SAVE10");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockCoupon);
    expect(Coupons.findOne).toHaveBeenCalledWith({
      where: { code: "SAVE10" },
    });
  });

  // Error Case: Coupon not found
  it("should return 404 if the coupon is not found", async () => {
    Coupons.findOne.mockResolvedValue(null);

    const response = await request(app).get(
      "/get-coupons-by-code/NONEXISTENTCODE"
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Coupon not found",
    });
    expect(Coupons.findOne).toHaveBeenCalledWith({
      where: { code: "NONEXISTENTCODE" },
    });
  });

  // Error Case: Server error
  it("should return 500 if there is a server error", async () => {
    Coupons.findOne.mockRejectedValue(new Error("Database error"));

    const response = await request(app).get("/get-coupons-by-code/SAVE10");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Internal Server Error" });
    expect(Coupons.findOne).toHaveBeenCalledWith({
      where: { code: "SAVE10" },
    });
  });
});
