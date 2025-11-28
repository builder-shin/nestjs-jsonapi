import { Controller, Inject } from "@nestjs/common";
import {
  JsonApiController,
  JsonApiCrudController,
  BeforeAction,
  PrismaAdapterService,
  JsonApiQueryService,
  JsonApiSerializerService,
  JsonApiModuleOptions,
  JSON_API_MODULE_OPTIONS,
} from "@builder-shin/nestjs-jsonapi";
import { CommentSerializer } from "./comment.serializer";
import { CreateCommentDto, UpdateCommentDto } from "./dto";

/**
 * CommentController
 *
 * 댓글 리소스에 대한 JSON:API CRUD 엔드포인트를 제공합니다.
 *
 * 사용 가능한 엔드포인트:
 * - GET    /comments          - 댓글 목록 조회
 * - GET    /comments/:id      - 댓글 상세 조회
 * - POST   /comments          - 댓글 생성
 * - PATCH  /comments/:id      - 댓글 수정
 * - DELETE /comments/:id      - 댓글 삭제
 */
@Controller("comments")
@JsonApiController({
  model: "comment",
  serializer: CommentSerializer,
  dto: {
    create: CreateCommentDto,
    update: UpdateCommentDto,
  },
  // 허용할 액션
  only: ["index", "show", "create", "update", "delete"],
  // 쿼리 파라미터 화이트리스트
  query: {
    allowedFilters: ["authorId", "articleId", "createdAt"],
    allowedSorts: ["createdAt", "-createdAt"],
    allowedIncludes: ["author", "article", "article.author"],
    maxIncludeDepth: 2,
    onDisallowed: "error",
  },
})
@BeforeAction("logRequest")
export class CommentController extends JsonApiCrudController {
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
    console.log(`[Comment] ${this.currentAction} 요청`);
  }

  // 라이프사이클 훅 오버라이드
  protected async beforeCreate(): Promise<void> {
    console.log("[Comment] 댓글 생성 전 처리");
  }

  protected async afterCreate(): Promise<void> {
    console.log(`[Comment] 댓글 생성 완료: ${this.record?.id}`);
    // 여기에 알림 로직 등을 추가할 수 있습니다
  }

  protected async beforeDelete(): Promise<void> {
    console.log(`[Comment] 댓글 삭제 전 처리: ${this.record?.id}`);
  }
}
