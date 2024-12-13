import Joi from "joi";
import { MESSAGES } from "../../constants/messages.constant.js";
import { MIN_PASSWORD_LENGTH } from "../../constants/auth.constant.js";

const schema = Joi.object({
  email: Joi.string().email().required().messages({
    "any.required": MESSAGES.AUTH.COMMON.EMAIL.REQUIRED,
    "string.email": MESSAGES.AUTH.COMMON.EMAIL.INVALID_FORMAT,
  }),
  password: Joi.string().required().min(MIN_PASSWORD_LENGTH).messages({
    "any.required": MESSAGES.AUTH.COMMON.PASSWORD.REQUIRED,
    "string.min": MESSAGES.AUTH.COMMON.PASSWORD.MIN_LENGTH,
  }),
  passwordConfirm: Joi.string()
    .required()
    // Joi의 기능 중 하나 앞의 내용과 비교해서 일치해야지만 하는 데이터는 .valid(Joi.ref("***")를 쓴다.
    .valid(Joi.ref("password"))
    .messages({
      "any.required": MESSAGES.AUTH.COMMON.PASSWORD_CONFIRM.REQUIRED,
      "any.only":
        MESSAGES.AUTH.COMMON.PASSWORD_CONFIRM.NOT_MATCHED_WITH_PASSWORD,
    }),
  name: Joi.string().required().messages({
    "any.required": MESSAGES.AUTH.COMMON.NAME.REQUIRED,
  }),
});

export const signUpValidator = async (req, res, next) => {
  try {
    await schema.validateAsync(req.body);
    next();
  } catch (error) {
    next(error);
  }
};
