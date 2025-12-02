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
            name: "Admin",
            role: "admin",
        },
    });
    const user1 = await prisma.user.create({
        data: {
            email: "user1@example.com",
            name: "John Doe",
            role: "user",
        },
    });
    const user2 = await prisma.user.create({
        data: {
            email: "user2@example.com",
            name: "Jane Smith",
            role: "user",
        },
    });
    const article1 = await prisma.article.create({
        data: {
            title: "Getting Started with NestJS JSON:API",
            content: "In this article, we will learn how to build a RESTful API using NestJS and the JSON:API spec.",
            status: "published",
            publishedAt: new Date(),
            authorId: admin.id,
        },
    });
    const article2 = await prisma.article.create({
        data: {
            title: "How to Use Prisma ORM",
            content: "This article explains how to efficiently manage databases using Prisma ORM.",
            status: "published",
            publishedAt: new Date(),
            authorId: user1.id,
        },
    });
    const article3 = await prisma.article.create({
        data: {
            title: "Work in Progress",
            content: "This article is still being written.",
            status: "draft",
            authorId: user2.id,
        },
    });
    await prisma.comment.createMany({
        data: [
            {
                body: "Thanks for the great article!",
                authorId: user1.id,
                articleId: article1.id,
            },
            {
                body: "This was very helpful.",
                authorId: user2.id,
                articleId: article1.id,
            },
            {
                body: "Prisma is really convenient!",
                authorId: admin.id,
                articleId: article2.id,
            },
        ],
    });
    console.log("Seed data created successfully.");
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