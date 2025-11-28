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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArticleSerializer = void 0;
const nestjs_jsonapi_1 = require("@builder-shin/nestjs-jsonapi");
const user_serializer_1 = require("../users/user.serializer");
let ArticleSerializer = class ArticleSerializer {
    title;
    content;
    status;
    publishedAt;
    createdAt;
    updatedAt;
    author;
    comments;
};
exports.ArticleSerializer = ArticleSerializer;
__decorate([
    (0, nestjs_jsonapi_1.Attribute)(),
    __metadata("design:type", String)
], ArticleSerializer.prototype, "title", void 0);
__decorate([
    (0, nestjs_jsonapi_1.Attribute)(),
    __metadata("design:type", String)
], ArticleSerializer.prototype, "content", void 0);
__decorate([
    (0, nestjs_jsonapi_1.Attribute)(),
    __metadata("design:type", String)
], ArticleSerializer.prototype, "status", void 0);
__decorate([
    (0, nestjs_jsonapi_1.Attribute)(),
    __metadata("design:type", Object)
], ArticleSerializer.prototype, "publishedAt", void 0);
__decorate([
    (0, nestjs_jsonapi_1.Attribute)(),
    __metadata("design:type", Date)
], ArticleSerializer.prototype, "createdAt", void 0);
__decorate([
    (0, nestjs_jsonapi_1.Attribute)(),
    __metadata("design:type", Date)
], ArticleSerializer.prototype, "updatedAt", void 0);
__decorate([
    (0, nestjs_jsonapi_1.Relationship)(() => user_serializer_1.UserSerializer),
    __metadata("design:type", Object)
], ArticleSerializer.prototype, "author", void 0);
__decorate([
    (0, nestjs_jsonapi_1.Relationship)(() => require("../comments/comment.serializer").CommentSerializer),
    __metadata("design:type", Array)
], ArticleSerializer.prototype, "comments", void 0);
exports.ArticleSerializer = ArticleSerializer = __decorate([
    (0, nestjs_jsonapi_1.JsonApiSerializer)({ type: "articles" })
], ArticleSerializer);
//# sourceMappingURL=article.serializer.js.map