export const HTTPS_STATUS = {
  OK: 200, // 호출 성공 했을 때
  Created: 201, // 생성에 성공했을때
  Bad_Request: 400, // 사용자가 잘못했을 때 (예 : 입력 값을 빠트렸을 때 )
  Unauthorized: 401, // 인증 실패 (예 : 비밀번호가  틀렸을 때)
  Forbidden: 403, // 인가 실패 (예 : 접근 권한이 없을 때)
  Not_Found: 404, //
  Conflict: 409, // 충돌 발생 (예 : 이메일 중복)
  Internal_Server_Error: 500, // 예상치 못한 에러가 발생했을 때
};
