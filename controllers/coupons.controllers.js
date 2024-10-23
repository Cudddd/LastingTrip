const { Coupons } = require("../models");
const user = require("../models/coupons");

const create = async (req, res) => {
  const { code, percent, begin, end } = req.body;

  if (!code) {
    return res
      .status(400)
      .json({ error: "'code' is required and must not be null." });
  }

  if (typeof percent !== "number" || percent <= 0 || percent > 100) {
    return res
      .status(400)
      .json({ error: "'percent' must be a number between 1 and 100." });
  }

  if (!begin || !end || isNaN(new Date(begin)) || isNaN(new Date(end))) {
    return res
      .status(400)
      .json({ error: "'begin' and 'end' must be valid dates." });
  }

  if (new Date(begin) >= new Date(end)) {
    return res
      .status(400)
      .json({ error: "'begin' date must be before 'end' date." });
  }

  try {
    const newCoupon = await Coupons.create({
      code,
      percent,
      begin,
      end,
    });
    res.status(201).send(newCoupon);
  } catch (error) {
    res.status(500).send({ error: "Internal Server Error" });
  }
};

const getAllCoupon = async (req, res) => {
  try {
    const couponList = await Coupons.findAll();
    res.status(200).json(couponList);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const displayCoupon = async (req, res) => {
  try {
    const coupon = await Coupons.findAll({ raw: true });
    res.render("coupons", { datatable: coupon });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const editCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;
    const { code, percent, start, end } = req.body;

    // Validation
    if (code && typeof code !== "string") {
      return res
        .status(400)
        .send({ error: "Invalid 'code'. It must be a string." });
    }

    if (
      percent !== undefined &&
      (typeof percent !== "number" || percent <= 0 || percent > 100)
    ) {
      return res
        .status(400)
        .send({ error: "'percent' must be a number between 1 and 100." });
    }

    if (start && isNaN(new Date(start))) {
      return res.status(400).send({ error: "'start' must be a valid date." });
    }

    if (end && isNaN(new Date(end))) {
      return res.status(400).send({ error: "'end' must be a valid date." });
    }

    if (start && end && new Date(start) >= new Date(end)) {
      return res
        .status(400)
        .send({ error: "'start' date must be before 'end' date." });
    }

    const detailCoupon = await Coupons.findOne({
      where: {
        id: couponId,
      },
    });

    if (!detailCoupon) {
      return res.status(404).send({
        status: "error",
        message: `Coupon with id ${couponId} not found`,
      });
    }

    // Updating fields only if they are provided
    if (code) detailCoupon.code = code;
    if (percent !== undefined) detailCoupon.percent = percent;
    if (start) detailCoupon.start = start;
    if (end) detailCoupon.end = end;

    const updateCoupon = await detailCoupon.save();
    if (!updateCoupon) {
      return res.status(400).send({
        error: "error",
        message: `Failed to update coupon with id ${couponId}`,
      });
    }

    res.status(200).send({ updateCoupon }); // Send back updated coupon
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;
    const result = await Coupons.destroy({ where: { id: couponId } });

    if (result === 0) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    return res.status(200).json({ message: "Coupon deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getDetailCoupon = async (req, res) => {
  try {
    const detailCoupon = await Coupons.findOne({
      where: {
        id: req.params.id,
      },
    });

    if (!detailCoupon) {
      return res.status(404).send({
        error: "Coupon not found",
      });
    }

    res.status(200).send(detailCoupon);
  } catch (error) {
    console.error("Error fetching coupon:", error);
    res.status(500).send({
      error: "Internal Server Error",
    });
  }
};

const getCouponByCode = async (req, res) => {
  try {
    const couponCode = req.params.code;

    // Validation for couponCode
    if (
      !couponCode ||
      typeof couponCode !== "string" ||
      couponCode.trim() === ""
    ) {
      return res
        .status(400)
        .json({ error: "'code' is required and must be a non-empty string." });
    }

    const coupon = await Coupons.findOne({
      where: {
        code: couponCode,
      },
    });

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.status(200).json(coupon);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  create,
  getAllCoupon,
  displayCoupon,
  editCoupon,
  deleteCoupon,
  getDetailCoupon,
  getCouponByCode,
};
