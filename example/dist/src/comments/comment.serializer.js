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
exports.CommentSerializer = void 0;
const nestjs_jsonapi_1 = require("@builder-shin/nestjs-jsonapi");
const user_serializer_1 = require("../users/user.serializer");
const article_serializer_1 = require("../articles/article.serializer");
let CommentSerializer = class CommentSerializer {
    body;
    createdAt;
    updatedAt;
    author;
    article;
};
exports.CommentSerializer = CommentSerializer;
__decorate([
    (0, nestjs_jsonapi_1.Attribute)(),
    __metadata("design:type", String)
], CommentSerializer.prototype, "body", void 0);
__decorate([
    (0, nestjs_jsonapi_1.Attribute)(),
    __metadata("design:type", Date)
], CommentSerializer.prototype, "createdAt", void 0);
__decorate([
    (0, nestjs_jsonapi_1.Attribute)(),
    __metadata("design:type", Date)
], CommentSerializer.prototype, "updatedAt", void 0);
__decorate([
    (0, nestjs_jsonapi_1.Relationship)(() => user_serializer_1.UserSerializer),
    __metadata("design:type", Object)
], CommentSerializer.prototype, "author", void 0);
__decorate([
    (0, nestjs_jsonapi_1.Relationship)(() => article_serializer_1.ArticleSerializer),
    __metadata("design:type", Object)
], CommentSerializer.prototype, "article", void 0);
exports.CommentSerializer = CommentSerializer = __decorate([
    (0, nestjs_jsonapi_1.JsonApiSerializer)({ type: "comments" })
], CommentSerializer);
//# sourceMappingURL=comment.serializer.js.map