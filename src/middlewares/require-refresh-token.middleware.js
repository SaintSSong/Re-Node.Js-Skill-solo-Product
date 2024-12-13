import { REFRESH_TOKEN_SECRET } from "../constants/env.constant.js";
import { HTTPS_STATUS } from "../constants/http.status.constant.js";
import { MESSAGES } from "../constants/messages.constant.js";
import { prisma } from "../utils/prisma.util.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const requireRefreshToken = async (req, res, next) => {
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
    // JWT 표준 인증 형태와 일치하지 않는 경우 (Authorization: Bearer {{ refreshToken }} <- 이런거)
    const [type, refreshToken] = authorization.split(" ");

    if (type !== "Bearer") {
      return res.status(HTTPS_STATUS.Unauthorized).json({
        status: HTTPS_STATUS.Unauthorized,
        message: MESSAGES.AUTH.COMMON.JWT.NOT_SUPPORTED_TYPE,
      });
    }

    // refreshToken이 없는 경우 ( {{ refreshToken }} <- 이런 거)
    if (!refreshToken) {
      return res.status(HTTPS_STATUS.Unauthorized).json({
        status: HTTPS_STATUS.Unauthorized,
        message: MESSAGES.AUTH.COMMON.JWT.NO_TOKEN,
      });
    }

    // let payload를 여기다가 선언한 이유는 밑에서도 사용 할 것이니까!
    let payload;

    try {
      payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    } catch (error) {
      // refreshToken의 유효기한이 지난 경우
      if (error.name === "TokenExpiredError") {
        return res.status(HTTPS_STATUS.Unauthorized).json({
          status: HTTPS_STATUS.Unauthorized,
          message: MESSAGES.AUTH.COMMON.JWT.EXPIRED,
        });
      }

      // 그 밖의 refreshToken 검증에 실패한 경우
      else {
        return res.status(HTTPS_STATUS.Unauthorized).json({
          status: HTTPS_STATUS.Unauthorized,
          message: MESSAGES.AUTH.COMMON.JWT.INVALID,
        });
      }
    }

    console.log("payload", payload);
    // 여기까지 통과를 했다면 refreshToken이 유효하긴 한거다.

    // 기존 AccessToken과 다른 점 추가 코드

    // Payload에 담긴 사용자 ID와 일치하는 사용자가 없는 경우 (DB에 없는 경우, 탈퇴 등)
    const { userId } = payload;

    // DB에서 RefreshToken을 조회
    const existedRefreshToken = await prisma.refreshToken.findUnique({
      where: {
        userId: userId,
      },
    });

    // ?을 붙인거는 옵셔널 체이닝  뜻은 "?" 왼쪽이 존재해? 그러면 "." 뒤로도 진행
    // 해석은 existedRefreshToken이 존재해? ok 근데 그 속에 refreshToken도 존재해?? 그러면 && 오른쪽으로 넘어가
    // 넘어가면 내가 넘겨 받은 refreshToken이랑 DB에서 조회해서 가지고 있는 녀석이랑 일치해?
    const isValidRefreshToken =
      existedRefreshToken?.refreshToken &&
      bcrypt.compareSync(refreshToken, existedRefreshToken.refreshToken);

    console.log("isValidRefreshToken", isValidRefreshToken);

    if (!isValidRefreshToken) {
      return res.status(HTTPS_STATUS.Unauthorized).json({
        status: HTTPS_STATUS.Unauthorized,
        message: MESSAGES.AUTH.COMMON.JWT.DISCARDED_TOKEN,
      });
    }

    //넘겨받은 RefreshToken과 비교

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
