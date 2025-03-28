const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { setPreferredCurrencies, getExchangeRates } = require("../controllers/currencyController");

const router = express.Router();


router.post("/", protect, setPreferredCurrencies);

router.get("/exchangerates", protect, getExchangeRates);

module.exports = router;