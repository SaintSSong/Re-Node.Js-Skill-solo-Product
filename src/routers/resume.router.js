import express from "express";
import { prisma } from "../utils/prisma.util.js";
import { MESSAGES } from "../constants/messages.constant.js";
import { HTTPS_STATUS } from "../constants/http.status.constant.js";
import { requireAccessToken } from "../middlewares/require-access-token.middleware.js";
import { createResumeValidator } from "../middlewares/vaildators/create-resume-vaildator.middleware.js";
import { updateResumeValidator } from "../middlewares/vaildators/update-resume-vaildator.middleware.js";
import { requireRoles } from "../middlewares/requir-roles.middleware.js";
import { USER_ROLE } from "../constants/user.constant.js";
import { updateResumeStatusValidator } from "../middlewares/vaildators/update-resume-status-vaildator.middleware.js";
const resumeRouter = express.Router();

// 이력서 생성

resumeRouter.post("/", createResumeValidator, async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { title, content } = req.body;

    const createResume = await prisma.resume.create({
      data: { userId: +userId, title: title, content: content },
    });

    return res.status(HTTPS_STATUS.Created).json({
      status: HTTPS_STATUS.Created,
      message: MESSAGES.RESUMES.CREATED.SUCCEED,
      date: createResume,
    });
  } catch (error) {
    next(error);
  }
});

// 이력서 목록 조회

/**
 * 1. **요청 정보**
    - 사용자 정보는 **인증 Middleware(`req.user`)**를 통해서 전달 받습니다.
    - **Query Parameters**(**`req.query`**)으로 **정렬** 조건을 받습니다.
    - **생성일시 기준 정렬**은 **`과거순(ASC),` `최신순(DESC)`**으로 전달 받습니다. 값이 없는 경우 **`최신순(DESC)`** 정렬을 기본으로 합니다. 대소문자 구분 없이 동작해야 합니다.
    - 예) **`sort=desc`**
2. **유효성 검증 및 에러 처리**
    - **일치하는 값이 없는 경우** - 빈 배열(**`[]`**)을 반환합니다. (StatusCode: 200)
3. **비즈니스 로직(데이터 처리)**
    - 현재 **로그인 한 사용자가 작성**한 이력서 목록만 조회합니다.
    - DB에서 이력서 조회 시 **작성자 ID**가 일치해야 합니다.
    - **정렬 조건**에 따라 다른 결과 값을 조회합니다.
    - **작성자 ID**가 아닌 **작성자 이름**을 반환하기 위해 스키마에 정의 한 **Relation**을 활용해 조회합니다.
 */
resumeRouter.get("/", requireAccessToken, async (req, res, next) => {
  try {
    const user = req.user;

    const userId = user.userId;

    // 내가 몰랐고 해설을 통해서 알게 된 것!
    let { sort } = req.query;

    // sort가 존재하면 그건 대소문자 상관없이 소문자로
    sort = sort?.toLowerCase();

    // sort가 (req.query가 "ASC","DESC"도 아니면) 둘다 아니면 기본 DESC로
    if (sort !== "asc" && sort !== "desc") {
      sort = "desc";
    }

    const whereCondition = {};

    // 채용 담당자인 경우
    if (user.role === USER_ROLE.RECRUITER) {
      // status를 받고, query 조건에 추가
      const { status } = req.query;

      if (status) {
        whereCondition.status = status;
      }

      // 채용 담당자가 아닌 경우
    } else {
      // 자긴이 작성한 이력서만 조회
      whereCondition.userId = userId;
    }

    // 이력서 목록만 조회
    let data = await prisma.resume.findMany({
      where: whereCondition,
      orderBy: {
        createdAt: sort,
      },
      include: {
        user: true,
      },
    });

    data = data.map((Resume) => {
      return {
        id: Resume.userId,
        authorName: Resume.user.name,
        title: Resume.title,
        content: Resume.content,
        status: Resume.status,
        createdAt: Resume.createdAt,
        updatedAt: Resume.updatedAt,
      };
    });

    return res.status(HTTPS_STATUS.OK).json({
      status: HTTPS_STATUS.OK,
      message: MESSAGES.RESUMES.READ_LIST.SUCCEED,
      date: data,
    });
  } catch (error) {
    next(error);
  }
});

// 이력서 상세 조회
resumeRouter.get("/:resumeId", requireAccessToken, async (req, res, next) => {
  try {
    const user = req.user;

    const userId = user.userId;

    const { resumeId } = req.params;

    // 선택 과제
    const whereCondition = {
      resumeId: +resumeId,
      // userId,
    };

    if (user.role !== USER_ROLE.RECRUITER) {
      whereCondition.userId = userId;
    }
    console.log("whereCondition", whereCondition);

    // 기존에는 where : {
    // resumeId: +resumeId,
    // userId
    // }; 이렇게 있었는데 userId를 넣는 순간 조회가 안된다.
    // 왜냐하면 { resumeId: 1, userId: 1 } 이란 이력서는 존재하지 않기 때문에!!
    // resumeId로만 검색을해야지 이력서가 나오지 심사관이 작성한 이력서는 존재하지 않기 때문에 그렇다.

    let data = await prisma.resume.findFirst({
      where: whereCondition,
      include: {
        user: true,
      },
    });

    if (!data) {
      return res.status(HTTPS_STATUS.Not_Found).json({
        status: HTTPS_STATUS.Not_Found,
        message: MESSAGES.RESUMES.COMMON.NOT_FOUND,
      });
    }

    // 방법 1

    // data.name = data.user.name;
    // data.userId = undefined;
    // data.user = undefined;

    // 방법 2

    data = {
      id: data.userId,
      authorName: data.user.name,
      title: data.title,
      content: data.content,
      status: data.status,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };

    // map을 사용하면 안된다. 왜 그럴까 생각해보기
    // map은 어떨때만 사용 가능하는가?

    // data = data.map((Resume) => {
    //   return {
    //     id: Resume.userId,
    //     name: Resume.user.name,
    //     title: Resume.title,
    //     content: Resume.content,
    //     createdAt: Resume.createdAt,
    //     updatedAt: Resume.updatedAt,
    //   };
    // });

    return res.status(HTTPS_STATUS.OK).json({
      status: HTTPS_STATUS.OK,
      message: MESSAGES.RESUMES.READ_DETAIL.SUCCEED,
      date: data,
    });
  } catch (error) {
    next(error);
  }
});

// 이력서 수정 API
resumeRouter.put(
  "/:resumeId",
  requireAccessToken,
  updateResumeValidator,
  async (req, res, next) => {
    try {
      const { userId } = req.user;
      const { resumeId } = req.params;
      const { title, content } = req.body;

      // // 내가 혼자서 했을 때 방법
      // if (!title && !content) {
      //   return res.status(HTTPS_STATUS.Bad_Request).json({
      //     status: HTTPS_STATUS.Bad_Request,
      //     message: "수정 할 정보를 입력해 주세요.",
      //   });
      // }

      // 해설에서의 오류처리 updateResumeValidator 통한 오류 처리

      // 이력서를 찾아보자.
      const existedResume = await prisma.resume.findUnique({
        where: { userId, resumeId: +resumeId },
      });

      if (!existedResume) {
        return res.status(HTTPS_STATUS.Not_Found).json({
          status: HTTPS_STATUS.Not_Found,
          message: "이력서가 존재하지 않습니다.",
        });
      }

      // 이력서 업데이트
      // 어떻게 할까? 찾은 이력서는 existedResume 있다. 그러면 그걸 활용해보자.

      // // 내가 작성한 코드
      // const updateResume = await prisma.resume.update({
      //   where: { userId, resumeId: +resumeId },
      //   data: { title, content },
      // });

      // updateResume = {
      //   resumeId: updateResume.resumeId,
      //   id: updateResume.userId,
      //   title: updateResume.title,
      //   content: updateResume.content,
      //   status: updateResume.status,
      //   createdAt: updateResume.createdAt,
      //   updatedAt: updateResume.updatedAt,
      // };

      // 해설에서 나온 수정 코드

      const data = await prisma.resume.update({
        where: { userId, resumeId: +resumeId },
        data: { ...(title && { title }), ...(content && { content }) },
      });

      return res.status(HTTPS_STATUS.OK).json({
        status: HTTPS_STATUS.OK,
        message: MESSAGES.RESUMES.UPDATE.SUCCEED,
        date: data,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 이력서 삭제 API
resumeRouter.delete(
  "/:resumeId",
  requireAccessToken,
  async (req, res, next) => {
    try {
      const { userId } = req.user;
      const { resumeId } = req.params;

      const existedResume = await prisma.resume.findUnique({
        where: { userId, resumeId: +resumeId },
      });

      if (!existedResume) {
        return res.status(HTTPS_STATUS.Not_Found).json({
          status: HTTPS_STATUS.Not_Found,
          message: "이력서가 존재하지 않습니다.",
        });
      }

      const deleteResume = await prisma.resume.delete({
        where: { userId, resumeId: +resumeId },
      });

      return res.status(HTTPS_STATUS.OK).json({
        status: HTTPS_STATUS.OK,
        message: MESSAGES.RESUMES.DELETE.SUCCEED,
        date: deleteResume.resumeId,
      });
    } catch (error) {
      next(error);
    }
  }
);

// 지원상태 변경 API
resumeRouter.patch(
  "/:resumeId/status",
  requireRoles([USER_ROLE.RECRUITER]),
  updateResumeStatusValidator,
  async (req, res, next) => {
    try {
      const user = req.user;
      const recruiterId = user.userId;
      const { resumeId } = req.params;

      const { status, reason } = req.body;

      // 트랜잭션
      await prisma.$transaction(async (tx) => {
        // 이력서 정보 조회
        const existedResume = await tx.resume.findUnique({
          where: {
            resumeId: +resumeId,
          },
        });

        // 이력서 정보가 없는 경우
        if (!existedResume) {
          return res.status(HTTPS_STATUS.Not_Found).json({
            status: HTTPS_STATUS.Not_Found,
            message: MESSAGES.RESUMES.COMMON.NOT_FOUND,
          });
        }

        // 이력서 지원 상태  수정
        const updatedResume = await tx.resume.update({
          where: { resumeId: +resumeId },
          data: { status },
        });

        // 이력서 로그 수정
        const data = await tx.resumeLog.create({
          data: {
            recruiterId,
            resumeId: existedResume.resumeId,
            oldStatus: existedResume.status,
            newStatus: updatedResume.status,
            reason,
          },
        });

        return res.status(HTTPS_STATUS.OK).json({
          status: HTTPS_STATUS.OK,
          message: MESSAGES.RESUMES.UPDATE.STATUS.SUCCEED,
          date: data,
        });
      });
    } catch (error) {
      next(error);
    }
  }
);

// 이력서 로그 목록 조회
resumeRouter.get(
  "/:resumeId/logs",
  requireRoles([USER_ROLE.RECRUITER]),
  async (req, res, next) => {
    try {
      const { resumeId } = req.params;

      let data = await prisma.resumeLog.findMany({
        where: { resumeId: +resumeId },
        orderBy: {
          createdAt: "desc",
        },
        // user?
        // 병신인가.. select을 하고 자빠졌누.
        include: { recruiter: true },
      });

      console.log("1번 foundResume", data);

      data = data.map((log) => {
        return {
          Id: log.id,
          recruiterName: log.recruiter.name,
          resumeId: log.resumeId,
          oldStatus: log.oldStatus,
          newStatus: log.newStatus,
          reason: log.reason,
          createdAt: log.createdAt,
        };
      });

      console.log("foundResume", data);

      return res.status(HTTPS_STATUS.OK).json({
        status: HTTPS_STATUS.OK,
        message: MESSAGES.RESUMES.READ_LIST.LOG.SUCCEED,
        date: data,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default resumeRouter;
