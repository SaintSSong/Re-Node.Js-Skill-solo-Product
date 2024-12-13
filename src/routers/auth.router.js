import express from "express";
import { HTTPS_STATUS } from "../constants/http.status.constant.js";
import { prisma } from "../utils/prisma.util.js";
import { MESSAGES } from "../constants/messages.constant.js";
import {
  ACCESS_TOKEN_EXPIRED_IN,
  HASH_SALT_ROUNDS,
  REFRESH_TOKEN_EXPIRED_IN,
} from "../constants/auth.constant.js";
import { signUpValidator } from "../middlewares/vaildators/sign-up-vaildator.middleware.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import {
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
} from "../constants/env.constant.js";
import { signInValidator } from "../middlewares/vaildators/sign-in-vaildator.middleware.js";
import { requireRefreshToken } from "../middlewares/require-refresh-token.middleware.js";

const authRouter = express.Router();

// 회원가입

/** 내가 몰랐던 것 "이메일 형식" 확인하는 방법 <- 어케 하지? 정규식 이런 걸 써야하나?
 * 정답은 Joi에 있다.*/

authRouter.post("/sign-up", signUpValidator, async (req, res, next) => {
  try {
    // - **이메일, 비밀번호, 비밀번호 확인, 이름**을 **Request Body**(**`req.body`**)로 전달 받습니다.
    const { email, password, name } = req.body;

    //     - **이메일이 중복되는 경우** - “이미 가입 된 사용자입니다.”
    const existedUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existedUser) {
      return res
        .status(HTTPS_STATUS.Conflict)
        .json({ errorMessage: MESSAGES.AUTH.COMMON.EMAIL.DUPLICATED });
    }

    /**사용자 ID, 역할, 생성일시, 수정일시는 자동 생성됩니다. */

    const hashPassword = bcrypt.hashSync(password, HASH_SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashPassword,
      },
    });

    user.password = undefined;

    return res
      .status(HTTPS_STATUS.Created)
      .json({ message: MESSAGES.AUTH.SIGN_UP.SUCCEED, data: user });
  } catch (error) {
    next(error);
  }
});

// 로그인 API

authRouter.post("/sign-in", signInValidator, async (req, res, next) => {
  try {
    //     - **이메일, 비밀번호**를 **Request Body**(**`req.body`**)로 전달 받습니다.
    const { email, password } = req.body;

    const existedUser = await prisma.user.findUnique({
      where: { email: email },
    });

    // 여기서부터는 해설에서 나온 코드
    // 코드 해석하면 && 이니까 이메일을 통해서 조회되어서 비밀번호까지 같이 검증되거나
    // 검증이 안되거나
    const isPasswordMatched =
      existedUser && bcrypt.compareSync(password, existedUser.password);

    if (!isPasswordMatched) {
      return res
        .status(HTTPS_STATUS.Unauthorized)
        .json({ errorMessage: MESSAGES.AUTH.COMMON.Unauthorized });
    }

    // AccessToken(Payload**에 **`사용자 ID`**를 포함하고, **유효기한**이 **`12시간`)**을 생성합니다.

    //해설에서 나온 코드
    const payload = { userId: existedUser.userId };

    const data = await generateAuthTokens(payload);

    // const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    //   expiresIn: ACCESS_TOKEN_EXPIRED_IN,
    // });

    // // AccessToken**을 반환합니다.

    // // refreshToken 제작
    // const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    //   expiresIn: REFRESH_TOKEN_EXPIRED_IN,
    // });

    // // refreshToken 암호화
    // const hashedRefreshToken = bcrypt.hashSync(refreshToken, HASH_SALT_ROUNDS);

    // // refreshToken 저장
    // // RefreshToken을 생성 또는 갱신
    // // 검색해서 있으면 업데이트 / 없으면 생성 그게 upsert

    // await prisma.refreshToken.upsert({
    //   where: { userId: existedUser.userId },
    //   update: { refreshToken: hashedRefreshToken },
    //   create: { userId: existedUser.userId, refreshToken: hashedRefreshToken },
    // });

    return res.status(HTTPS_STATUS.OK).json({
      message: MESSAGES.AUTH.SIGN_IN.SUCCEED,
      data: data,
    });
  } catch (error) {
    next(error);
  }
});

// 토큰 재발급 API
authRouter.post("/token", requireRefreshToken, async (req, res, next) => {
  try {
    const user = req.user;

    const payload = { userId: user.userId };

    // console.log("token.payload", payload);

    const data = await generateAuthTokens(payload);

    return res.status(HTTPS_STATUS.OK).json({
      message: MESSAGES.AUTH.TOKEN.SUCCEED,
      data: data,
    });
  } catch (error) {
    next(error);
  }
});

const generateAuthTokens = async (payload) => {
  const userId = payload.userId;

  //console.log("generateAuthTokens_userId", userId);

  const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRED_IN,
  });

  // console.log("accessToken", accessToken);

  const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRED_IN,
  });

  // console.log("REFRESH_TOKEN_EXPIRED_IN", REFRESH_TOKEN_EXPIRED_IN);
  // // 암호화를 또 해야해나?

  // console.log("refreshToken", refreshToken);

  const hashedRefreshToken = bcrypt.hashSync(refreshToken, HASH_SALT_ROUNDS);

  await prisma.refreshToken.upsert({
    where: { userId },
    update: { refreshToken: hashedRefreshToken },
    create: { userId, refreshToken: hashedRefreshToken },
  });

  return { accessToken, refreshToken };
};

// 로그아웃 API
authRouter.post("/sign-out", requireRefreshToken, async (req, res, next) => {
  try {
    const user = req.user;

    await prisma.refreshToken.update({
      where: {
        userId: user.userId,
      },
      data: { refreshToken: null },
    });

    return res.status(HTTPS_STATUS.OK).json({
      message: MESSAGES.AUTH.SIGN_OUT.SUCCEED,
      data: { id: user.userId },
    });
  } catch (error) {
    next(error);
  }
});

export default authRouter;
