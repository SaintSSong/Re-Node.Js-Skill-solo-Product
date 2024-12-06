import express from "express";
import { SERVER_PORT } from "../src/constants/env.constant.js";
import { errorHandler } from "../src/middlewares/error-handler.middleware.js";
import { HTTPS_STATUS } from "./constants/http.status.constant.js";
import "./utils/prisma.util.js";

const app = express();

app.use(express.json());

//AWS 로드밸런서 만들때 헬스 체크한다.
app.get("/health-check", (req, res) => {
  return res
    .status(HTTPS_STATUS.OK)
    .send(`${SERVER_PORT}번 서버로 입장이 무사히 완료되었습니다.`);
});

app.use(errorHandler);

app.listen(SERVER_PORT, () => {
  console.log(`${SERVER_PORT}서버가 실행중입니다.`);
});
