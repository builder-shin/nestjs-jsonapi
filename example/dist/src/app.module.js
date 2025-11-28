"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const nestjs_jsonapi_1 = require("@builder-shin/nestjs-jsonapi");
const prisma_1 = require("./prisma");
const users_1 = require("./users");
const articles_1 = require("./articles");
const comments_1 = require("./comments");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_1.PrismaModule,
            nestjs_jsonapi_1.JsonApiModule.forRoot({
                pagination: {
                    defaultLimit: 20,
                    maxLimit: 100,
                },
                baseUrl: "http://localhost:3000",
                prismaServiceToken: prisma_1.PrismaService,
                idType: "uuid",
                debug: true,
            }),
            users_1.UserModule,
            articles_1.ArticleModule,
            comments_1.CommentModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map