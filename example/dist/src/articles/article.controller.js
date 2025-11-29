"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArticleController = void 0;
const common_1 = require("@nestjs/common");
const nestjs_jsonapi_1 = require("@builder-shin/nestjs-jsonapi");
const article_serializer_1 = require("./article.serializer");
const dto_1 = require("./dto");
let ArticleController = class ArticleController extends nestjs_jsonapi_1.JsonApiCrudController {
    _prismaAdapter;
    _queryService;
    _serializerService;
    _moduleOptions;
    constructor(_prismaAdapter, _queryService, _serializerService, _moduleOptions) {
        super();
        this._prismaAdapter = _prismaAdapter;
        this._queryService = _queryService;
        this._serializerService = _serializerService;
        this._moduleOptions = _moduleOptions;
    }
    get prismaAdapter() {
        return this._prismaAdapter;
    }
    get queryService() {
        return this._queryService;
    }
    get serializerService() {
        return this._serializerService;
    }
    get moduleOptions() {
        return this._moduleOptions;
    }
    async publish(id) {
        return this.executeAction("publish", async () => {
            const updated = await this.prismaAdapter.update("article", { id }, {
                status: "published",
                publishedAt: new Date(),
            });
            return this.serializerService.serializeOne(updated, article_serializer_1.ArticleSerializer);
        });
    }
    async archive(id) {
        return this.executeAction("archive", async () => {
            const updated = await this.prismaAdapter.update("article", { id }, { status: "archived" });
            return this.serializerService.serializeOne(updated, article_serializer_1.ArticleSerializer);
        });
    }
    async logRequest() {
        console.log(`[Article] ${this.currentAction} 요청`);
    }
    async loadArticle() {
        console.log(`[Article] 레코드 로드 중`);
    }
    async notifySubscribers() {
        console.log(`[Article] 구독자에게 발행 알림 전송: ${this.record?.id}`);
    }
    async beforeCreate() {
        if (!this.model.status) {
            this.model.status = "draft";
        }
        console.log("[Article] 게시글 생성 전 처리");
    }
    async afterCreate() {
        console.log(`[Article] 게시글 생성 완료: ${this.record?.id}`);
    }
    async beforeUpdate() {
        if (this.model.status === "published" && !this.model.publishedAt) {
            this.model.publishedAt = new Date();
        }
        console.log(`[Article] 게시글 수정 전 처리: ${this.record?.id}`);
    }
    async beforeDelete() {
        console.log(`[Article] 게시글 삭제 전 처리: ${this.record?.id}`);
    }
};
exports.ArticleController = ArticleController;
__decorate([
    (0, common_1.Post)(":id/publish"),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, nestjs_jsonapi_1.JsonApiAction)("publish"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ArticleController.prototype, "publish", null);
__decorate([
    (0, common_1.Post)(":id/archive"),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, nestjs_jsonapi_1.JsonApiAction)("archive"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ArticleController.prototype, "archive", null);
exports.ArticleController = ArticleController = __decorate([
    (0, common_1.Controller)("articles"),
    (0, nestjs_jsonapi_1.JsonApiController)({
        model: "article",
        serializer: article_serializer_1.ArticleSerializer,
        dto: {
            create: dto_1.CreateArticleDto,
            update: dto_1.UpdateArticleDto,
        },
        only: ["index", "show", "create", "createMany", "update", "delete"],
        query: {
            allowedFilters: ["status", "authorId", "createdAt", "title"],
            allowedSorts: ["createdAt", "-createdAt", "title", "-title", "publishedAt", "-publishedAt"],
            allowedIncludes: ["author", "comments", "comments.author"],
            maxIncludeDepth: 2,
            onDisallowed: "error",
        },
    }),
    (0, nestjs_jsonapi_1.BeforeAction)("logRequest"),
    (0, nestjs_jsonapi_1.BeforeAction)("loadArticle", { only: ["show", "update", "delete", "publish", "archive"] }),
    (0, nestjs_jsonapi_1.AfterAction)("notifySubscribers", { only: ["publish"] }),
    __param(3, (0, common_1.Inject)(nestjs_jsonapi_1.JSON_API_MODULE_OPTIONS)),
    __metadata("design:paramtypes", [nestjs_jsonapi_1.PrismaAdapterService,
        nestjs_jsonapi_1.JsonApiQueryService,
        nestjs_jsonapi_1.JsonApiSerializerService, Object])
], ArticleController);
//# sourceMappingURL=article.controller.js.map