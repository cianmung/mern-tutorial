const User = require("../models/User");
const Note = require("../models/Note");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password").lean();
  if (!users?.length) {
    return res.status(400).json({ message: "No users found" });
  }
  res.json(users);
});

const createNewUser = asyncHandler(async (req, res) => {
  const { username, password, roles } = req.body;

  //Confirm data
  if (!username || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  //Check for duplicate
  const duplicate = await User.findOne({ username })
    .collation({
      locale: "en",
      strength: 2,
    })
    .lean()
    .exec();
  if (duplicate) {
    return res.status(409).json({ message: "Duplicate username" });
  }

  //Hash password
  const hashedPwd = await bcrypt.hash(password, 10); //salt rounds
  const userObject =
    !Array.isArray(roles) || !roles.length
      ? { username, password: hashedPwd }
      : { username, password: hashedPwd, roles };

  //Create and store new user
  const user = await User.create(userObject);
  if (user) {
    //created
    res
      .status(201)
      .json({ message: `New user  ${username} has been created.` });
  } else {
    res.status(400).json({ message: "Invalid user data received." });
  }
});

const updateUser = asyncHandler(async (req, res) => {
  const { id, username, roles, active, password } = req.body;

  //Confirm data
  if (
    !id ||
    !username ||
    !Array.isArray(roles) ||
    !roles.length ||
    typeof active !== "boolean"
  ) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const user = await User.findById(id).exec();
  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  // Check for duplicate
  const duplicate = await User.findOne({ username })
    .collation({
      locale: "en",
      strength: 2,
    })
    .lean()
    .exec();
  //Allow updates to the original user
  if (duplicate && duplicate?._id.toString() !== id) {
    return res.status(409).json({ message: "Duplicate username" });
  }

  user.username = username;
  user.roles = roles;
  user.active = active;

  if (password) {
    // Hash password
    user.password = await bcrypt.hash(password, 10);
  }

  const updatedUser = await user.save();
  res.json({ message: `${updatedUser.username} is updated.` });
});

const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ message: "User ID required." });
  }

  const notes = await Note.findOne({ user: id }).lean().exec();
  if (notes?.length) {
    return res.status(400).json({ message: "User has assigned notes." });
  }

  const user = await User.findById(id).exec();
  if (!user) {
    return res.status(400).json({ message: "User not found." });
  }

  const result = await user.deleteOne();

  const reply = `Username ${result.username} with ID ${result._id} is deleted.`;

  res.json(reply);
});

module.exports = {
  getAllUsers,
  createNewUser,
  updateUser,
  deleteUser,
};
