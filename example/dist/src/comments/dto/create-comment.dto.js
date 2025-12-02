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
exports.CreateCommentDto = void 0;
const class_validator_1 = require("class-validator");
class CreateCommentDto {
    body;
    authorId;
    articleId;
}
exports.CreateCommentDto = CreateCommentDto;
__decorate([
    (0, class_validator_1.IsString)({ message: "Comment body must be a string" }),
    (0, class_validator_1.IsNotEmpty)({ message: "Comment body is required" }),
    __metadata("design:type", String)
], CreateCommentDto.prototype, "body", void 0);
__decorate([
    (0, class_validator_1.IsUUID)("4", { message: "Author ID must be a valid UUID" }),
    (0, class_validator_1.IsNotEmpty)({ message: "Author ID is required" }),
    __metadata("design:type", String)
], CreateCommentDto.prototype, "authorId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)("4", { message: "Article ID must be a valid UUID" }),
    (0, class_validator_1.IsNotEmpty)({ message: "Article ID is required" }),
    __metadata("design:type", String)
], CreateCommentDto.prototype, "articleId", void 0);
//# sourceMappingURL=create-comment.dto.js.map