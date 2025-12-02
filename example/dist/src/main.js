"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const logger = new common_1.Logger("Bootstrap");
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    app.enableCors();
    const port = process.env.PORT || 3000;
    await app.listen(port);
    logger.log(`🚀 Application is running at http://localhost:${port}`);
    logger.log(`📚 JSON:API Endpoints:`);
    logger.log(`   - GET    /users          - List users`);
    logger.log(`   - GET    /users/:id      - Get user details`);
    logger.log(`   - POST   /users          - Create user`);
    logger.log(`   - PATCH  /users/:id      - Update user`);
    logger.log(`   - DELETE /users/:id      - Delete user`);
    logger.log(`   - GET    /articles       - List articles`);
    logger.log(`   - GET    /articles/:id   - Get article details`);
    logger.log(`   - POST   /articles       - Create article`);
    logger.log(`   - PATCH  /articles/:id   - Update article`);
    logger.log(`   - DELETE /articles/:id   - Delete article`);
    logger.log(`   - POST   /articles/:id/publish - Publish article`);
    logger.log(`   - POST   /articles/:id/archive - Archive article`);
    logger.log(`   - GET    /comments       - List comments`);
    logger.log(`   - GET    /comments/:id   - Get comment details`);
    logger.log(`   - POST   /comments       - Create comment`);
    logger.log(`   - PATCH  /comments/:id   - Update comment`);
    logger.log(`   - DELETE /comments/:id   - Delete comment`);
}
bootstrap();
//# sourceMappingURL=main.js.map