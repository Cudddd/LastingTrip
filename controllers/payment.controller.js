const { Booking, Room, User, Hotels } = require("../models");
const { Op, sequelize } = require("sequelize");

const createBooking = async (req, res) => {
  const {
    room_id,
    user_id,
    check_in_date,
    check_out_date,
    total_price,
    status,
    special_requests,
    quantity,
    full_name,
    hotel_id,
  } = req.body;

  // Validation
  if (
    !room_id ||
    !user_id ||
    !check_in_date ||
    !check_out_date ||
    !total_price ||
    !quantity ||
    !full_name ||
    !hotel_id
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (new Date(check_in_date) >= new Date(check_out_date)) {
    return res
      .status(400)
      .json({ error: "'check_in_date' must be before 'check_out_date'" });
  }
  if (typeof total_price !== "number" || total_price <= 0) {
    return res
      .status(400)
      .json({ error: "'total_price' must be a positive number" });
  }
  if (typeof quantity !== "number" || quantity <= 0) {
    return res
      .status(400)
      .json({ error: "'quantity' must be a positive number" });
  }

  try {
    // Check room availability
    const room = await Room.findOne({ where: { id: room_id } });
    if (!room) {
      return res.status(400).send({ message: "Room not found" });
    }

    const bookedQuantity = await Booking.sum("quantity", {
      where: {
        room_id,
        check_in_date: { [Op.lt]: check_out_date },
        check_out_date: { [Op.gt]: check_in_date },
      },
    });

    if ((bookedQuantity || 0) + quantity > room.quantity) {
      return res
        .status(400)
        .send({ message: "Not enough rooms available for the selected dates" });
    }

    const newBooking = await Booking.create({
      room_id,
      user_id,
      check_in_date,
      check_out_date,
      total_price,
      status,
      special_requests,
      quantity,
      full_name,
      hotel_id,
    });

    res.status(201).send(newBooking);
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).send(error);
  }
};

const getAllBooking = async (req, res) => {
  const {
    room_id,
    user_id,
    check_in_date,
    check_out_date,
    total_price,
    status,
    special_requests,
    full_name,
    hotel_id,
  } = req.query;

  let whereClause = {};

  // Validation
  if (room_id && isNaN(parseInt(room_id))) {
    return res.status(400).json({ error: "'room_id' must be a valid number" });
  }
  if (user_id && isNaN(parseInt(user_id))) {
    return res.status(400).json({ error: "'user_id' must be a valid number" });
  }
  if (hotel_id && isNaN(parseInt(hotel_id))) {
    return res.status(400).json({ error: "'hotel_id' must be a valid number" });
  }
  if (check_in_date && isNaN(new Date(check_in_date))) {
    return res
      .status(400)
      .json({ error: "'check_in_date' must be a valid date" });
  }
  if (check_out_date && isNaN(new Date(check_out_date))) {
    return res
      .status(400)
      .json({ error: "'check_out_date' must be a valid date" });
  }

  try {
    let bookings;

    if (Object.keys(whereClause).length === 0) {
      bookings = await Booking.findAll({
        include: [
          {
            model: Hotels,
            attributes: ["id", "name"],
          },
        ],
      });
    } else {
      bookings = await Booking.findAll({
        where: whereClause,
      });
    }

    res.status(200).send(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).send(error);
  }
};

const getDetailBooking = async (req, res) => {
  const { id } = req.params;

  try {
    // Find booking details by ID
    const booking = await Booking.findOne({
      where: { id },
      include: [
        {
          model: Room,
          attributes: ["id", "name", "price", "hotelId"],
          include: [
            {
              model: Hotels, // Change `Hotel` to match your model name
              attributes: ["name"],
            },
          ],
        },
        { model: User, attributes: ["id", "name", "email", "numberPhone"] },
      ],
    });

    if (!booking) {
      return res.status(404).send({ message: "Booking not found" });
    }

    res.status(200).send(booking);
  } catch (error) {
    console.error("Error fetching booking details:", error);
    res.status(500).send(error);
  }
};

const deleteBooking = async (req, res) => {
  const { id } = req.params;

  try {
    // Find and delete booking by ID
    const deletedBooking = await Booking.destroy({
      where: { id },
    });

    if (!deletedBooking) {
      return res.status(404).send({ message: "Booking not found" });
    }

    res.status(200).send({ message: "Booking deleted successfully" });
  } catch (error) {
    console.error("Error deleting booking:", error);
    res.status(500).send(error);
  }
};

const getAvailability = async (req, res) => {
  const { checkInDate, checkOutDate, roomId, quantity } = req.query;

  // Validation
  if (!roomId || !checkInDate || !checkOutDate || !quantity) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const room = await Room.findOne({ where: { id: roomId } });
    if (!room) {
      return res.status(400).send({ message: "Room not found" });
    }

    const bookedQuantity = await Booking.sum("quantity", {
      where: {
        room_id: roomId,
        check_in_date: { [Op.lt]: checkOutDate },
        check_out_date: { [Op.gt]: checkInDate },
      },
    });

    const availableQuantity = room.quantity - (bookedQuantity || 0);

    if (availableQuantity < quantity) {
      return res
        .status(400)
        .send({ message: "Not enough rooms available for the selected dates" });
    }

    res.status(200).send({ availableQuantity });
  } catch (error) {
    console.error("Error checking room availability:", error);
    res.status(500).send({ message: "Internal Server error" });
  }
};

module.exports = {
  createBooking,
  getAllBooking,
  getDetailBooking,
  deleteBooking,
  getAvailability,
};
