import { Controller, Inject } from "@nestjs/common";
import {
  JsonApiController,
  JsonApiCrudController,
  BeforeAction,
  AfterAction,
  PrismaAdapterService,
  JsonApiQueryService,
  JsonApiSerializerService,
  JsonApiModuleOptions,
  JSON_API_MODULE_OPTIONS,
} from "@builder-shin/nestjs-jsonapi";
import { UserSerializer } from "./user.serializer";
import { CreateUserDto, UpdateUserDto } from "./dto";

/**
 * UserController
 *
 * 사용자 리소스에 대한 JSON:API CRUD 엔드포인트를 제공합니다.
 *
 * 사용 가능한 엔드포인트:
 * - GET    /users          - 사용자 목록 조회
 * - GET    /users/:id      - 사용자 상세 조회
 * - POST   /users          - 사용자 생성
 * - PATCH  /users/:id      - 사용자 수정
 * - DELETE /users/:id      - 사용자 삭제
 */
@Controller("users")
@JsonApiController({
  model: "user",
  serializer: UserSerializer,
  dto: {
    create: CreateUserDto,
    update: UpdateUserDto,
  },
  // 허용할 액션 명시 (bulk 작업 제외)
  only: ["index", "show", "create", "update", "delete"],
  // 쿼리 파라미터 화이트리스트
  query: {
    allowedFilters: ["email", "name", "role", "createdAt"],
    allowedSorts: ["createdAt", "-createdAt", "name", "-name", "email"],
    allowedIncludes: ["articles", "comments"],
    maxIncludeDepth: 1,
    onDisallowed: "error",
  },
})
@BeforeAction("logRequest")
@AfterAction("logResponse", { except: ["index"] })
export class UserController extends JsonApiCrudController {
  constructor(
    private readonly _prismaAdapter: PrismaAdapterService,
    private readonly _queryService: JsonApiQueryService,
    private readonly _serializerService: JsonApiSerializerService,
    @Inject(JSON_API_MODULE_OPTIONS)
    private readonly _moduleOptions: JsonApiModuleOptions
  ) {
    super();
  }

  // 추상 getter 구현 (필수)
  protected get prismaAdapter() {
    return this._prismaAdapter;
  }

  protected get queryService() {
    return this._queryService;
  }

  protected get serializerService() {
    return this._serializerService;
  }

  protected get moduleOptions() {
    return this._moduleOptions;
  }

  // 커스텀 훅 메서드
  protected async logRequest(): Promise<void> {
    console.log(`[User] ${this.currentAction} 요청 시작`);
  }

  protected async logResponse(): Promise<void> {
    console.log(`[User] ${this.currentAction} 응답 완료`);
  }

  // 라이프사이클 훅 오버라이드
  protected async beforeCreate(): Promise<void> {
    // 이메일 중복 체크 등의 로직을 여기에 추가할 수 있습니다
    console.log("[User] 사용자 생성 전 처리");
  }

  protected async afterCreate(): Promise<void> {
    // 생성 후 알림 발송 등의 로직을 여기에 추가할 수 있습니다
    console.log(`[User] 사용자 생성 완료: ${this.record?.id}`);
  }

  protected async beforeDelete(): Promise<void> {
    // 삭제 전 검증 로직을 여기에 추가할 수 있습니다
    console.log(`[User] 사용자 삭제 전 처리: ${this.record?.id}`);
  }
}
