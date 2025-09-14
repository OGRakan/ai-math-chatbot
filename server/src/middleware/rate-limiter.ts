import rateLimit from 'express-rate-limit';

// Mirror the Python rate limiter behavior
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    detail: 'Too many requests from this IP, please try again later.',
  },
  handler: (req, res) => {
    res.status(429).json({
      detail: 'Too many requests from this IP, please try again later.',
    });
  },
});