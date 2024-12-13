import express from "express";
import { prisma } from "../utils/prisma.util.js";
import { HTTPS_STATUS } from "../constants/http.status.constant.js";
import { requireAccessToken } from "../middlewares/require-access-token.middleware.js";
import { MESSAGES } from "../constants/messages.constant.js";

const userRouter = express.Router();

// 내 정보 조회 API

// 1. **요청 정보**
//     - 사용자 정보는 **인증 Middleware(`req.user`)**를 통해서 전달 받습니다.
// 2. **반환 정보**
//     - **사용자 ID, 이메일, 이름, 역할, 생성일시, 수정일시**를 반환합니다.

userRouter.get("/me", requireAccessToken, async (req, res, next) => {
  try {
    const { userId } = req.user;

    // userId를 통한 user 찾기
    const findUser = await prisma.user.findUnique({
      where: { userId: +userId },
    });

    if (!findUser) {
      return res.status(HTTPS_STATUS.Unauthorized).json({
        status: HTTPS_STATUS.Unauthorized,
        message: MESSAGES.AUTH.COMMON.Unauthorized,
      });
    }

    findUser.password = undefined;

    // 반환정보
    return res.status(HTTPS_STATUS.OK).json({
      status: HTTPS_STATUS.OK,
      message: MESSAGES.USERS.READ_ME.SUCCEED,
      data: findUser,
    });
  } catch (error) {
    next(error);
  }
});

export default userRouter;
