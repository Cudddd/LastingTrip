const { Amenities } = require("../models");

const { Op } = require("sequelize");
const createAmenity = async (req, res) => {
  const { name, Aclass } = req.body;

  // Validation
  if (!name || typeof name !== "string" || name.trim() === "") {
    return res.status(400).send({ message: "'name' is required." });
  }

  if (!Aclass || typeof Aclass !== "string" || Aclass.trim() === "") {
    return res.status(400).send({ message: "'Aclass' is required." });
  }

  if (name.length < 3) {
    return res.status(400).send({ message: "'name' is too short." });
  }

  if (name.length > 255) {
    return res.status(400).send({ message: "'name' is too long." });
  }

  try {
    const newAmenity = await Amenities.create({
      name,
      Aclass,
    });
    res.status(201).send(newAmenity);
  } catch (error) {
    res.status(500).send(error);
  }
};

const getAllAmenity = async (req, res) => {
  const { name, type } = req.query;
  try {
    let queryOptions = {};

    if (name) {
      queryOptions.name = {
        [Op.like]: `%${name}%`,
      };
    }

    if (type) {
      queryOptions.type = type;
    }

    const AmenityList = await Amenities.findAll({
      where: queryOptions,
    });

    res.status(200).send(AmenityList);
  } catch (error) {
    res.status(500).send(error);
  }
};

const getDetailAmenity = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).send({ message: "'id' is required." });
  }
  try {
    const detailAmenity = await Amenities.findOne({
      where: {
        id,
      },
    });
    if (!detailAmenity) {
      return res.status(404).send({ message: "Amenity not found." });
    }
    res.status(200).send(detailAmenity);
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

// const updateAmenity = async (req, res) => {
//   const { id } = req.params;
//   const { name, adress, province } = req.body;
//   try {
//     const detailAmenity = await Amenitys.findOne({
//       where: {
//         id,
//       },
//     });
//     detailAmenity.name = name;
//     detailAmenity.adress = adress;
//     detailAmenity.province = province;
//     await detailAmenity.save();
//     res.status(200).send(detailAmenity);
//   } catch (error) {
//     res.status(500).send(error);
//   }
// };

// // const deleteAmenity = async (req, res) => {
// //   const { id } = req.params;
// //   try {
// //     await Amenity.destroy({
// //       where: {
// //         id,
// //       },
// //     });
// //     res.status(200).send("xoa thanh cong");
// //   } catch (error) {
// //     res.status(500).send(error);
// //   }
// // };

module.exports = {
  createAmenity,
  getAllAmenity,
  getDetailAmenity,

  //   updateAmenity,
  //   deleteAmenity,
};
