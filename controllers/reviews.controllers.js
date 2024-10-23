const { Reviews, Hotels, User } = require("../models");
const { Op } = require("sequelize");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const createReview = async (req, res) => {
  try {
    const { rating, description, hotelId, guestId } = req.body;

    // Validate required fields and data types
    if (!guestId || !hotelId || rating === undefined) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (
      !description ||
      typeof description !== "string" ||
      description.trim() === ""
    ) {
      return res
        .status(400)
        .json({ error: "'description' must be a non-empty string." });
    }

    let newReviewData = {
      rating,
      description,
      hotelId,
      guestId,
    };

    const { file } = req;
    if (file) {
      const imagePath = file.path;
      newReviewData.file = imagePath;
    }

    const newReview = await Reviews.create(newReviewData);

    res.status(201).send(newReview);
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

const getAllReview = async (req, res) => {
  const { hotelId } = req.query;

  try {
    // Validate that hotelId is provided and is a valid number
    if (!hotelId || isNaN(hotelId)) {
      return res.status(400).json({
        error: "'hotelId' is required and must be a valid number.",
      });
    }

    const reviews = await Reviews.findAll({
      where: { hotelId },
      include: [
        {
          model: Hotels,
          attributes: ["name"],
        },
        {
          model: User,
          attributes: ["name", "url"],
        },
      ],
    });

    if (!reviews || reviews.length === 0) {
      return res.status(404).json({ error: "No reviews found for this hotel" });
    }

    const reviewsWithInfo = reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      description: review.description,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      hotelId: review.hotelId,
      hotelName: review.Hotel.name,
      guestId: review.guestId,
      guestName: review.User.name,
      guestAvatar: review.User.url,
    }));

    res.status(200).json(reviewsWithInfo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getFullReview = async (req, res) => {
  try {
    const hotelList = await Reviews.findAll();
    res.status(200).json(hotelList);
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getDetailReview = async (req, res) => {
  const { id } = req.params;
  try {
    const detailReview = await Reviews.findOne({
      where: {
        id,
      },
    });
    res.status(200).send(detailReview);
  } catch (error) {
    res.status(500).send(error);
  }
};

const updateReview = async (req, res) => {
  const { id } = req.params;
  const { name, price, address, star } = req.body;

  // Validation for required fields and data types
  if (!name || typeof name !== "string" || name.trim() === "") {
    return res
      .status(400)
      .json({ error: "'name' is required and must be a non-empty string." });
  }

  if (!address || typeof address !== "string" || address.trim() === "") {
    return res
      .status(400)
      .json({ error: "'address' is required and must be a non-empty string." });
  }

  if (star === undefined || typeof star !== "number" || star < 1 || star > 5) {
    return res
      .status(400)
      .json({ error: "'star' must be a number between 1 and 5." });
  }

  if (price === undefined || typeof price !== "number" || price < 0) {
    return res
      .status(400)
      .json({ error: "'price' must be a non-negative number." });
  }

  try {
    const detailReview = await Reviews.findOne({
      where: { id },
    });

    if (!detailReview) {
      return res.status(404).json({ error: "Review not found" });
    }

    detailReview.name = name;
    detailReview.address = address;
    detailReview.star = star;
    detailReview.price = price;
    await detailReview.save();

    res.status(200).send(detailReview);
  } catch (error) {
    console.error("updateReview failed", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

const deleteReview = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedReview = await Reviews.findOne({
      where: {
        id,
      },
    });
    await deletedReview.destroy({ cascade: true });

    res.status(200).send("Successful");
  } catch (error) {
    res.status(500).send(error);
  }
};

module.exports = {
  createReview,
  deleteReview,
  updateReview,
  getDetailReview,
  getAllReview,
  getFullReview,
};
