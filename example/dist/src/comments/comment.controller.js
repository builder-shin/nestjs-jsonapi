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
exports.CommentController = void 0;
const common_1 = require("@nestjs/common");
const nestjs_jsonapi_1 = require("@builder-shin/nestjs-jsonapi");
const comment_serializer_1 = require("./comment.serializer");
const dto_1 = require("./dto");
let CommentController = class CommentController extends nestjs_jsonapi_1.JsonApiCrudController {
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
    async logRequest() {
        console.log(`[Comment] ${this.currentAction} request`);
    }
    async beforeCreate() {
        console.log("[Comment] Pre-create processing");
    }
    async afterCreate() {
        console.log(`[Comment] Comment created: ${this.record?.id}`);
    }
    async beforeDelete() {
        console.log(`[Comment] Pre-delete processing: ${this.record?.id}`);
    }
};
exports.CommentController = CommentController;
exports.CommentController = CommentController = __decorate([
    (0, common_1.Controller)("comments"),
    (0, nestjs_jsonapi_1.JsonApiController)({
        model: "comment",
        serializer: comment_serializer_1.CommentSerializer,
        dto: {
            create: dto_1.CreateCommentDto,
            update: dto_1.UpdateCommentDto,
        },
        only: ["index", "show", "create", "update", "delete"],
        query: {
            allowedFilters: ["authorId", "articleId", "createdAt"],
            allowedSorts: ["createdAt", "-createdAt"],
            allowedIncludes: ["author", "article", "article.author"],
            maxIncludeDepth: 2,
            onDisallowed: "error",
        },
    }),
    (0, nestjs_jsonapi_1.BeforeAction)("logRequest"),
    __param(3, (0, common_1.Inject)(nestjs_jsonapi_1.JSON_API_MODULE_OPTIONS)),
    __metadata("design:paramtypes", [nestjs_jsonapi_1.PrismaAdapterService,
        nestjs_jsonapi_1.JsonApiQueryService,
        nestjs_jsonapi_1.JsonApiSerializerService, Object])
], CommentController);
//# sourceMappingURL=comment.controller.js.map