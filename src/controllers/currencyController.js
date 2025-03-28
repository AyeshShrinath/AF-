const axios = require("axios");
const Currency = require("../models/Currency");

// Set or update preferred currencies
const setPreferredCurrencies = async (req, res) => {
    try {
        const { baseCurrency, preferredCurrencies } = req.body;

        if (!baseCurrency || !preferredCurrencies) {
            return res.status(400).json({ message: "Base currency and preferred currencies are required" });
        }

        let currencySettings = await Currency.findOne({ user: req.user.id });

        if (currencySettings) {
            currencySettings.baseCurrency = baseCurrency;
            currencySettings.preferredCurrencies = preferredCurrencies;
            await currencySettings.save();
        } else {
            currencySettings = new Currency({
                user: req.user.id,
                baseCurrency,
                preferredCurrencies,
            });
            await currencySettings.save();
        }

        res.status(200).json(currencySettings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get exchange rates for user’s preferred currencies
const getExchangeRates = async (req, res) => {
    try {
        const currencySettings = await Currency.findOne({ user: req.user.id });

        if (!currencySettings) {
            return res.status(400).json({ message: "User currency settings not found" });
        }

        const { baseCurrency, preferredCurrencies } = currencySettings;
        const apiKey = process.env.EXCHANGE_RATE_API_KEY;
        const response = await axios.get(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/${baseCurrency}`);

        if (response.data && response.data.conversion_rates) {
            let rates = {};
            preferredCurrencies.forEach((currency) => {
                if (response.data.conversion_rates[currency]) {
                    rates[currency] = response.data.conversion_rates[currency];
                }
            });

            res.status(200).json({ baseCurrency, exchangeRates: rates });
        } else {
            res.status(500).json({ message: "Failed to fetch exchange rates" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { setPreferredCurrencies, getExchangeRates };
