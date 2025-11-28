import { Controller, Inject, Post, Param, HttpCode, HttpStatus } from "@nestjs/common";
import {
  JsonApiController,
  JsonApiCrudController,
  JsonApiAction,
  BeforeAction,
  AfterAction,
  PrismaAdapterService,
  JsonApiQueryService,
  JsonApiSerializerService,
  JsonApiModuleOptions,
  JSON_API_MODULE_OPTIONS,
} from "@builder-shin/nestjs-jsonapi";
import { ArticleSerializer } from "./article.serializer";
import { CreateArticleDto, UpdateArticleDto } from "./dto";

/**
 * ArticleController
 *
 * 게시글 리소스에 대한 JSON:API CRUD 엔드포인트를 제공합니다.
 *
 * 사용 가능한 엔드포인트:
 * - GET    /articles                - 게시글 목록 조회
 * - GET    /articles/:id            - 게시글 상세 조회
 * - POST   /articles                - 게시글 생성
 * - POST   /articles/_bulk/create   - 게시글 일괄 생성
 * - PATCH  /articles/:id            - 게시글 수정
 * - DELETE /articles/:id            - 게시글 삭제
 * - POST   /articles/:id/publish    - 게시글 발행 (커스텀 액션)
 * - POST   /articles/:id/archive    - 게시글 보관 (커스텀 액션)
 */
@Controller("articles")
@JsonApiController({
  model: "article",
  serializer: ArticleSerializer,
  dto: {
    create: CreateArticleDto,
    update: UpdateArticleDto,
  },
  // 허용할 액션 (벌크 생성 포함)
  only: ["index", "show", "create", "createMany", "update", "delete"],
  // 쿼리 파라미터 화이트리스트
  query: {
    allowedFilters: ["status", "authorId", "createdAt", "title"],
    allowedSorts: ["createdAt", "-createdAt", "title", "-title", "publishedAt", "-publishedAt"],
    allowedIncludes: ["author", "comments", "comments.author"],
    maxIncludeDepth: 2,
    onDisallowed: "error",
  },
})
@BeforeAction("logRequest")
@BeforeAction("loadArticle", { only: ["show", "update", "delete", "publish", "archive"] })
@AfterAction("notifySubscribers", { only: ["publish"] })
export class ArticleController extends JsonApiCrudController {
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

  /**
   * 게시글 발행 커스텀 액션
   *
   * POST /articles/:id/publish
   */
  @Post(":id/publish")
  @HttpCode(HttpStatus.OK)
  @JsonApiAction("publish")
  async publish(@Param("id") id: string) {
    return this.executeAction("publish", async () => {
      const updated = await this.prismaAdapter.update(
        "article",
        { id },
        {
          status: "published",
          publishedAt: new Date(),
        }
      );

      return this.serializerService.serializeOne(updated, ArticleSerializer);
    });
  }

  /**
   * 게시글 보관 커스텀 액션
   *
   * POST /articles/:id/archive
   */
  @Post(":id/archive")
  @HttpCode(HttpStatus.OK)
  @JsonApiAction("archive")
  async archive(@Param("id") id: string) {
    return this.executeAction("archive", async () => {
      const updated = await this.prismaAdapter.update("article", { id }, { status: "archived" });

      return this.serializerService.serializeOne(updated, ArticleSerializer);
    });
  }

  // 커스텀 훅 메서드
  protected async logRequest(): Promise<void> {
    console.log(`[Article] ${this.currentAction} 요청 - ${this.request.method} ${this.request.url}`);
  }

  protected async loadArticle(): Promise<void> {
    // 레코드 로드 (show, update, delete에서 자동으로 호출됨)
    console.log(`[Article] 레코드 로드 중: ${this.request.params.id}`);
  }

  protected async notifySubscribers(): Promise<void> {
    // 발행 알림 로직
    console.log(`[Article] 구독자에게 발행 알림 전송: ${this.record?.id}`);
  }

  // 라이프사이클 훅 오버라이드
  protected async beforeCreate(): Promise<void> {
    // 기본 상태를 draft로 설정
    if (!this.model.status) {
      this.model.status = "draft";
    }
    console.log("[Article] 게시글 생성 전 처리");
  }

  protected async afterCreate(): Promise<void> {
    console.log(`[Article] 게시글 생성 완료: ${this.record?.id}`);
  }

  protected async beforeUpdate(): Promise<void> {
    // 상태가 published로 변경되면 publishedAt 자동 설정
    if (this.model.status === "published" && !this.model.publishedAt) {
      this.model.publishedAt = new Date();
    }
    console.log(`[Article] 게시글 수정 전 처리: ${this.record?.id}`);
  }

  protected async beforeDelete(): Promise<void> {
    console.log(`[Article] 게시글 삭제 전 처리: ${this.record?.id}`);
  }
}
