import { HTTPS_STATUS } from "../constants/http.status.constant.js";

export const errorHandler = (err, req, res, next) => {
  console.error(err);

  // joi에서 발생한 에러 처리
  if (err.name === "ValidationError") {
    return res.status(HTTPS_STATUS.Bad_Request).json({
      status: HTTPS_STATUS.Bad_Request,
      message: err.message,
    });
  }

  // 그 밖의 예상치 못한 에러 처리
  return res.status(HTTPS_STATUS.Internal_Server_Error).json({
    status: HTTPS_STATUS.Internal_Server_Error,
    message: "예상치 못한 에러가 발생했습니다. 관리자에게 문의해 주세요.",
  });
};
