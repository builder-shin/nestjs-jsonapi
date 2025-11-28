"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    await prisma.comment.deleteMany();
    await prisma.article.deleteMany();
    await prisma.user.deleteMany();
    const admin = await prisma.user.create({
        data: {
            email: "admin@example.com",
            name: "관리자",
            role: "admin",
        },
    });
    const user1 = await prisma.user.create({
        data: {
            email: "user1@example.com",
            name: "홍길동",
            role: "user",
        },
    });
    const user2 = await prisma.user.create({
        data: {
            email: "user2@example.com",
            name: "김철수",
            role: "user",
        },
    });
    const article1 = await prisma.article.create({
        data: {
            title: "NestJS JSON:API 시작하기",
            content: "이 글에서는 NestJS와 JSON:API 스펙을 사용하여 RESTful API를 구축하는 방법을 알아봅니다.",
            status: "published",
            publishedAt: new Date(),
            authorId: admin.id,
        },
    });
    const article2 = await prisma.article.create({
        data: {
            title: "Prisma ORM 활용법",
            content: "Prisma ORM을 사용하여 데이터베이스를 효율적으로 관리하는 방법을 설명합니다.",
            status: "published",
            publishedAt: new Date(),
            authorId: user1.id,
        },
    });
    const article3 = await prisma.article.create({
        data: {
            title: "작성 중인 글",
            content: "이 글은 아직 작성 중입니다.",
            status: "draft",
            authorId: user2.id,
        },
    });
    await prisma.comment.createMany({
        data: [
            {
                body: "좋은 글 감사합니다!",
                authorId: user1.id,
                articleId: article1.id,
            },
            {
                body: "많은 도움이 되었습니다.",
                authorId: user2.id,
                articleId: article1.id,
            },
            {
                body: "Prisma 정말 편리하네요!",
                authorId: admin.id,
                articleId: article2.id,
            },
        ],
    });
    console.log("Seed 데이터가 성공적으로 생성되었습니다.");
    console.log(`- Users: ${await prisma.user.count()}`);
    console.log(`- Articles: ${await prisma.article.count()}`);
    console.log(`- Comments: ${await prisma.comment.count()}`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map