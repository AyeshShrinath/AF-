const {
  setPreferredCurrencies,
  getExchangeRates
} = require('../../controllers/currencyController');
const Currency = require('../../models/Currency');
const axios = require('axios');

// Mock dependencies
jest.mock('../../models/Currency');
jest.mock('axios');

describe('Currency Controller Unit Tests', () => {
  let mockRequest;
  let mockResponse;
  
  beforeEach(() => {
    mockRequest = {
      user: { id: 'user456' },
      body: {},
      params: {},
      query: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    process.env = { ...process.env, EXCHANGE_RATE_API_KEY: 'sample-api-key' };
  });

  describe('setPreferredCurrencies', () => {
    it('should return 400 if required fields are missing', async () => {
      mockRequest.body = { baseCurrency: 'EUR' };
      
      await setPreferredCurrencies(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
    
    it('should update existing currency settings', async () => {
      mockRequest.body = {
        baseCurrency: 'GBP',
        preferredCurrencies: ['USD', 'CAD', 'INR', 'SGD']
      };
      
      const mockSave = jest.fn();
      Currency.findOne = jest.fn().mockResolvedValue({
        baseCurrency: 'USD',
        preferredCurrencies: ['EUR'],
        save: mockSave
      });
      
      await setPreferredCurrencies(mockRequest, mockResponse);
      
      expect(Currency.findOne).toHaveBeenCalledWith({ user: 'user456' });
      expect(mockSave).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
    
    it('should create new currency settings if none exist', async () => {
      mockRequest.body = {
        baseCurrency: 'AUD',
        preferredCurrencies: ['NZD', 'CHF', 'CNY', 'HKD']
      };
      
      const mockSave = jest.fn();
      Currency.findOne = jest.fn().mockResolvedValue(null);
      Currency.mockImplementation(() => ({
        save: mockSave
      }));
      
      await setPreferredCurrencies(mockRequest, mockResponse);
      
      expect(Currency).toHaveBeenCalledWith({
        user: 'user456',
        baseCurrency: 'AUD',
        preferredCurrencies: ['NZD', 'CHF', 'CNY', 'HKD']
      });
      expect(mockSave).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });
  
  describe('getExchangeRates', () => {
    it('should return 400 if user currency settings not found', async () => {
      Currency.findOne = jest.fn().mockResolvedValue(null);
      
      await getExchangeRates(mockRequest, mockResponse);
      
      expect(Currency.findOne).toHaveBeenCalledWith({ user: 'user456' });
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
    
    it('should get exchange rates for preferred currencies', async () => {
      Currency.findOne = jest.fn().mockResolvedValue({
        baseCurrency: 'AUD',
        preferredCurrencies: ['NZD', 'CHF', 'CNY', 'HKD']
      });
      
      axios.get = jest.fn().mockResolvedValue({
        data: {
          conversion_rates: {
            NZD: 1.07,
            CHF: 0.91,
            CNY: 4.67,
            HKD: 5.88
          }
        }
      });
      
      await getExchangeRates(mockRequest, mockResponse);
      
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('AUD'));
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        baseCurrency: 'AUD',
        exchangeRates: {
          NZD: 1.07,
          CHF: 0.91,
          CNY: 4.67,
          HKD: 5.88
        }
      });
    });
    
    it('should handle API errors', async () => {
      Currency.findOne = jest.fn().mockResolvedValue({
        baseCurrency: 'GBP',
        preferredCurrencies: ['USD', 'CAD']
      });
      
      axios.get = jest.fn().mockRejectedValue(new Error('API Failure'));
      
      await getExchangeRates(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
    
    it('should handle invalid API response', async () => {
      Currency.findOne = jest.fn().mockResolvedValue({
        baseCurrency: 'GBP',
        preferredCurrencies: ['USD', 'CAD']
      });
      
      axios.get = jest.fn().mockResolvedValue({
        data: { success: false }
      });
      
      await getExchangeRates(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
});
