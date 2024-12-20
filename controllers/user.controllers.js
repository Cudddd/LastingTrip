const { User } = require("../models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const register = async (req, res) => {
  const { name, email, password, numberPhone, type } = req.body;

  // Validation
  if (!name || typeof name !== "string" || name.trim() === "") {
    return res
      .status(400)
      .json({ error: "'name' is required and must be a non-empty string." });
  }

  if (!email || typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({
      error: "'email' is required and must be a valid email address.",
    });
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    return res.status(400).json({
      error: "'password' is required and must be at least 6 characters long.",
    });
  }

  if (!numberPhone || !/^\d{10,15}$/.test(numberPhone)) {
    return res.status(400).json({
      error: "'numberPhone' is required and must be a valid phone number.",
    });
  }

  // if (
  //   !type ||
  //   typeof type !== "string" ||
  //   (type !== "user" && type !== "admin")
  // ) {
  //   return res.status(400).json({
  //     error: "'type' is required and must be either 'user' or 'admin'.",
  //   });
  // }

  try {
    // Kiểm tra xem email hoặc số điện thoại đã tồn tại hay chưa
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { numberPhone }],
      },
    });

    if (existingUser) {
      // Nếu email hoặc số điện thoại đã tồn tại
      return res
        .status(400)
        .json({ error: "Email or phone number already exists" });
    }

    // Nếu không tồn tại, tiến hành tạo người dùng mới
    const salt = bcrypt.genSaltSync(10);
    const hashPassword = bcrypt.hashSync(password, salt);
    const newUser = await User.create({
      name,
      email,
      password: hashPassword,
      numberPhone,
      type,
    });

    return res.status(201).send(newUser);
  } catch (error) {
    console.error("Error registering user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const loginGG = async (req, res) => {
  const user = req.body;

  const token = jwt.sign(
    { id: user.id, email: user.email, type: user.type },
    "firewallbase64",
    { expiresIn: 60 * 60 }
  );

  res.status(200).send({
    message: "successful",
    token,
    type: user.type,
    id: user.id,
    name: user.name,
  });
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });

    if (user) {
      const isAuthen = bcrypt.compareSync(password, user.password);

      if (isAuthen) {
        const token = jwt.sign(
          { email: user.email, type: user.type },
          "firewallbase64",
          { expiresIn: 60 * 60 }
        );

        res.status(200).send({
          message: "successful",
          token,
          name: user.name,
          type: user.type,
          id: user.id,
        });
      } else {
        res
          .status(401)
          .send({ message: "dang nhap that bai, kiem tra lai mat khau" });
      }
    } else {
      res.status(404).send({ message: "khong co nguoi dung nay" });
    }
  } catch (error) {
    console.error(error); // Always log errors for debugging
    res.status(500).send({ error: "Internal Server Error" });
  }
};

const getAllUser = async (req, res) => {
  const { name } = req.query;

  try {
    let UserList;

    // If `name` is provided, filter by it
    if (name) {
      UserList = await User.findAll({
        where: {
          name: {
            [Op.like]: `%${name}%`, // Using a wildcard search
          },
        },
      });
    } else {
      // If no filter, fetch all users
      UserList = await User.findAll();
    }

    res.status(200).send(UserList);
  } catch (error) {
    res.status(500).send({ error: "Internal Server Error" });
  }
};

const displayUser = async (req, res) => {
  {
    try {
      const users = await User.findAll({ raw: true });
      res.render("user", { datatable: users });
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }
};

const editUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const {
      name,
      email,
      password,
      numberPhone,
      birthDate,
      gender,
      type,
      cccd,
      address,
    } = req.body;

    // Validation
    if (name && (typeof name !== "string" || name.trim() === "")) {
      return res
        .status(400)
        .json({ error: "'name' must be a non-empty string." });
    }

    if (email && (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email))) {
      return res
        .status(400)
        .json({ error: "'email' must be a valid email address." });
    }

    if (password && (typeof password !== "string" || password.length < 6)) {
      return res
        .status(400)
        .json({ error: "'password' must be at least 6 characters long." });
    }

    if (
      numberPhone &&
      (typeof numberPhone !== "string" || !/^\d{10,15}$/.test(numberPhone))
    ) {
      return res
        .status(400)
        .json({ error: "'numberPhone' must be a valid phone number." });
    }

    if (birthDate && isNaN(new Date(birthDate))) {
      return res
        .status(400)
        .json({ error: "'birthDate' must be a valid date." });
    }

    if (gender && gender !== "male" && gender !== "female") {
      return res.status(400).json({
        error: "'gender' must be either 'male' or 'female'.",
      });
    }

    if (type && type !== "user" && type !== "admin") {
      return res
        .status(400)
        .json({ error: "'type' must be either 'user' or 'admin'." });
    }

    if (cccd && (typeof cccd !== "string" || cccd.trim() === "")) {
      return res
        .status(400)
        .json({ error: "'cccd' must be a non-empty string." });
    }

    if (address && (typeof address !== "string" || address.trim() === "")) {
      return res
        .status(400)
        .json({ error: "'address' must be a non-empty string." });
    }

    const detailUser = await User.findOne({
      where: {
        id: userId,
      },
    });

    if (!detailUser) {
      return res.status(404).send({
        status: `error`,
        message: `User with id ${userId} not found`,
      });
    }

    // Updating fields only if they are provided
    if (name) detailUser.name = name;
    if (email) detailUser.email = email;
    if (password) detailUser.password = password;
    if (numberPhone) detailUser.numberPhone = numberPhone;
    if (birthDate) detailUser.birthDate = birthDate;
    if (gender) detailUser.gender = gender;
    if (type) detailUser.type = type;
    if (cccd) detailUser.cccd = cccd;
    if (address) detailUser.address = address;

    const updateUser = await detailUser.save();
    if (!updateUser) {
      return res.status(400).send({
        error: `error`,
        message: `Failed to update user with id ${userId}`,
      });
    }

    res.status(200).send({ updateUser });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

const updatePassword = async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;

  // Validation
  if (!userId) {
    return res
      .status(400)
      .json({ error: "'userId' is required." });
  }

  if (
    !currentPassword ||
    typeof currentPassword !== "string" ||
    currentPassword.length < 6
  ) {
    return res
      .status(400)
      .json({
        error:
          "'currentPassword' is required and must be at least 6 characters long.",
      });
  }

  if (
    !newPassword ||
    typeof newPassword !== "string" ||
    newPassword.length < 6
  ) {
    return res
      .status(400)
      .json({
        error:
          "'newPassword' is required and must be at least 6 characters long.",
      });
  }

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Compare current password with the hashed password in the database
    const isPasswordValid = bcrypt.compareSync(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid current password" });
    }

    // Hash the new password
    const salt = bcrypt.genSaltSync(10);
    const hashedNewPassword = bcrypt.hashSync(newPassword, salt);

    // Update the password
    await user.update({ password: hashedNewPassword });

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const userToDelete = await User.findOne({
      where: {
        id,
      },
    });

    if (!userToDelete) {
      return res.status(404).json({ error: `User with id ${id} not found` });
    }

    await userToDelete.destroy({ cascade: true });

    res.status(200).send("Successful");
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateImage = async (req, res) => {
  const { id } = req.params;
  console.log("id", id);
  try {
    const updateHotel = await User.findOne({
      where: {
        id,
      },
    });

    if (!updateHotel) {
      return res.status(404).send("User not found");
    }

    const { file } = req;

    if (!file) {
      return res.status(400).send("No file uploaded");
    }

    console.log(file);
    const imagePath = file.path;
    console.log(imagePath);

    updateHotel.url = imagePath;
    await updateHotel.save(); // Sửa từ updateUser thành updateHotel
    res.status(200).send("Successful");
  } catch (error) {
    res.status(500).send(error);
  }
};

const getDetailUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Validation: Check if userId is a valid number
    if (!userId) {
      return res.status(400).json({ error: "'id' is require." });
    }

    // Find the user by id
    const detailUser = await User.findOne({
      where: {
        id: userId,
      },
    });

    if (!detailUser) {
      return res
        .status(404)
        .json({ error: `User with id ${userId} not found.` });
    }

    res.status(200).json(detailUser);
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  register,
  login,
  getAllUser,
  displayUser,
  editUser,
  deleteUser,
  updateImage,
  getDetailUser,
  updatePassword,
  loginGG,
};
