const express = require("express");
const { protect, admin } = require("../middleware/authMiddleware");
const { getUsers, updateUser, deleteUser } = require("../controllers/adminController");

const router = express.Router();


router.get("/users", protect, admin, getUsers);

router.put("/users/:id", protect, admin, updateUser);

router.delete("/users/:id", protect, admin, deleteUser);

module.exports = router;
