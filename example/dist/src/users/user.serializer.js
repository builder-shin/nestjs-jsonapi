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
exports.UserSerializer = void 0;
const nestjs_jsonapi_1 = require("@builder-shin/nestjs-jsonapi");
let UserSerializer = class UserSerializer {
    email;
    name;
    role;
    createdAt;
    updatedAt;
    articles;
    comments;
};
exports.UserSerializer = UserSerializer;
__decorate([
    (0, nestjs_jsonapi_1.Attribute)(),
    __metadata("design:type", String)
], UserSerializer.prototype, "email", void 0);
__decorate([
    (0, nestjs_jsonapi_1.Attribute)(),
    __metadata("design:type", String)
], UserSerializer.prototype, "name", void 0);
__decorate([
    (0, nestjs_jsonapi_1.Attribute)(),
    __metadata("design:type", String)
], UserSerializer.prototype, "role", void 0);
__decorate([
    (0, nestjs_jsonapi_1.Attribute)(),
    __metadata("design:type", Date)
], UserSerializer.prototype, "createdAt", void 0);
__decorate([
    (0, nestjs_jsonapi_1.Attribute)(),
    __metadata("design:type", Date)
], UserSerializer.prototype, "updatedAt", void 0);
__decorate([
    (0, nestjs_jsonapi_1.Relationship)(() => require("../articles/article.serializer").ArticleSerializer),
    __metadata("design:type", Array)
], UserSerializer.prototype, "articles", void 0);
__decorate([
    (0, nestjs_jsonapi_1.Relationship)(() => require("../comments/comment.serializer").CommentSerializer),
    __metadata("design:type", Array)
], UserSerializer.prototype, "comments", void 0);
exports.UserSerializer = UserSerializer = __decorate([
    (0, nestjs_jsonapi_1.JsonApiSerializer)({ type: "users" })
], UserSerializer);
//# sourceMappingURL=user.serializer.js.map