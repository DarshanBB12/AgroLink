const { body } = require("express-validator");

// Public registration only accepts these roles. Admin accounts are provisioned
// separately (npm run seed:admin) and can never be created through the public endpoint.
const roleOptions = ["farmer", "worker", "equipment_owner"];
const languageOptions = ["en", "hi", "kn", "ml", "ta", "te"];

const passwordRule = (field) =>
  body(field)
    .isString()
    .withMessage("Password is required")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[A-Za-z]/)
    .withMessage("Password must contain at least one letter")
    .matches(/\d/)
    .withMessage("Password must contain at least one number");

const registerValidation = [
  body("name").trim().isLength({ min: 2, max: 80 }).withMessage("Name must be at least 2 characters"),
  body("email").trim().isEmail().withMessage("Valid email is required"),
  passwordRule("password"),
  body("role").optional().isIn(roleOptions).withMessage("Invalid role"),
  body("preferredLanguage").optional().isIn(languageOptions).withMessage("Invalid language"),
  body("phone").optional({ values: "falsy" }).matches(/^[+\d][\d\s-]{6,17}$/).withMessage("Enter a valid phone number"),
];

const loginValidation = [
  body("email").trim().isEmail().withMessage("Valid email is required"),
  body("password").isString().notEmpty().withMessage("Password is required"),
];

const changePasswordValidation = [
  body("currentPassword").isString().notEmpty().withMessage("Current password is required"),
  passwordRule("newPassword"),
];

module.exports = { registerValidation, loginValidation, changePasswordValidation };
