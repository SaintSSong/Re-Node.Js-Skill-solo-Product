import { ACCESS_TOKEN_SECRET } from "../constants/env.constant.js";
import { HTTPS_STATUS } from "../constants/http.status.constant.js";
import { MESSAGES } from "../constants/messages.constant.js";
import { prisma } from "../utils/prisma.util.js";
import jwt from "jsonwebtoken";

export const requireAccessToken = async (req, res, next) => {
  try {
    // 인증 정보 파싱
    const authorization = req.headers.authorization;

    // authorization이 없는 경우
    if (!authorization) {
      return res.status(HTTPS_STATUS.Unauthorized).json({
        status: HTTPS_STATUS.Unauthorized,
        message: MESSAGES.AUTH.COMMON.JWT.NO_TOKEN,
      });
    }
    // JWT 표준 인증 형태와 일치하지 않는 경우 (Authorization: Bearer {{ AccessToken }} <- 이런거)
    const [type, accessToken] = authorization.split(" ");

    if (type !== "Bearer") {
      return res.status(HTTPS_STATUS.Unauthorized).json({
        status: HTTPS_STATUS.Unauthorized,
        message: MESSAGES.AUTH.COMMON.JWT.NOT_SUPPORTED_TYPE,
      });
    }

    // AccessToken이 없는 경우 ( {{ AccessToken }} <- 이런 거)
    if (!accessToken) {
      return res.status(HTTPS_STATUS.Unauthorized).json({
        status: HTTPS_STATUS.Unauthorized,
        message: MESSAGES.AUTH.COMMON.JWT.NO_TOKEN,
      });
    }

    // let payload를 여기다가 선언한 이유는 밑에서도 사용 할 것이니까!
    let payload;

    try {
      payload = jwt.verify(accessToken, ACCESS_TOKEN_SECRET);
    } catch (error) {
      // AccessToken의 유효기한이 지난 경우
      if (error.name === "TokenExpiredError") {
        return res.status(HTTPS_STATUS.Unauthorized).json({
          status: HTTPS_STATUS.Unauthorized,
          message: MESSAGES.AUTH.COMMON.JWT.EXPIRED,
        });
      }

      // 그 밖의 AccessToken 검증에 실패한 경우
      else {
        return res.status(HTTPS_STATUS.Unauthorized).json({
          status: HTTPS_STATUS.Unauthorized,
          message: MESSAGES.AUTH.COMMON.JWT.INVALID,
        });
      }
    }

    // 여기까지 통과를 했다면 AccessToken이 유효하긴 한거다.

    // Payload에 담긴 사용자 ID와 일치하는 사용자가 없는 경우 (DB에 없는 경우, 탈퇴 등)
    const { userId } = payload; // <- 이거는 안될거다 왜? 나는 userId라고 schema에 넣어놨으니

    const user = await prisma.user.findUnique({
      where: { userId: +userId },
    });

    if (!user) {
      return res.status(HTTPS_STATUS.Unauthorized).json({
        status: HTTPS_STATUS.Unauthorized,
        message: MESSAGES.AUTH.COMMON.JWT.NO_USER,
      });
    }

    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};
