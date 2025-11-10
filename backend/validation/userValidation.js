const Joi = require("joi");

const signUpValidation = (req, res, next) => {
  const checkSignUpValidate = Joi.object({
    username: Joi.string().min(3).max(20).required().messages({
      "string.empty": "Username is required!",
      "string.min": "Username must be at least 4 characters!",
      "string.max": "Username must not exceed 20 characters!",
    }),
    email: Joi.string().email().required().messages({
      "string.empty": "Email must be required!",
      "string.email": "Please enter a valid email address!",
    }),
    password: Joi.string().min(6).max(12).required().messages({
      "string.empty": "Password is required",
      "string.min": "Password must be at least 6 characters",
      "string.max": "Password must not exceed 12 characters",
    }),
  });
  const { error } = checkSignUpValidate.validate(req.body);
  if (error) {
    res.status(401).json({
      success: false,
      field: error.details[0].path[0],
      message: error.details[0].message,
    });
  }
  next();
};

const logInValidation = (req, res, next) => {
  const checkLogInValidate = Joi.object({
    username: Joi.string().min(3).max(20).required().messages({
      "string.empty": "Username is required!",
      "string.min": "Username must be at least 4 characters!",
      "string.max": "Username must not exceed 20 characters!",
    }),
    password: Joi.string().min(6).max(12).required().messages({
      "string.empty": "Password is required",
      "string.min": "Password must be at least 6 characters",
      "string.max": "Password must not exceed 12 characters",
    }),
  });
  const { error } = checkLogInValidate.validate(req.body);
  if (error) {
    res.status(401).json({
      success: false,
      field: error.details[0].path[0],
      message: error.details[0].message,
    });
  }
  next();
};

module.exports = { signUpValidation, logInValidation };
