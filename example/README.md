# NestJS JSON:API 예제

`@builder-shin/nestjs-jsonapi` 패키지를 사용한 예제 애플리케이션입니다.

## 개요

이 예제는 블로그 시스템을 구현하며, 다음 리소스를 포함합니다:

- **Users** - 사용자 관리
- **Articles** - 게시글 관리 (커스텀 액션 포함)
- **Comments** - 댓글 관리

## 시작하기

### 1. 의존성 설치

```bash
# 루트 디렉토리에서 실행
pnpm install
```

### 2. 데이터베이스 설정

```bash
cd packages/example

# Prisma 클라이언트 생성
pnpm prisma:generate

# 데이터베이스 마이그레이션
pnpm prisma:migrate

# 시드 데이터 삽입
pnpm prisma:seed
```

### 3. 애플리케이션 실행

```bash
# 개발 모드
pnpm start:dev

# 프로덕션 빌드
pnpm build
pnpm start:prod
```

## API 엔드포인트

### Users

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/users` | 사용자 목록 조회 |
| GET | `/users/:id` | 사용자 상세 조회 |
| POST | `/users` | 사용자 생성 |
| PATCH | `/users/:id` | 사용자 수정 |
| DELETE | `/users/:id` | 사용자 삭제 |

### Articles

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/articles` | 게시글 목록 조회 |
| GET | `/articles/:id` | 게시글 상세 조회 |
| POST | `/articles` | 게시글 생성 |
| POST | `/articles/_bulk/create` | 게시글 일괄 생성 |
| PATCH | `/articles/:id` | 게시글 수정 |
| DELETE | `/articles/:id` | 게시글 삭제 |
| POST | `/articles/:id/publish` | 게시글 발행 (커스텀) |
| POST | `/articles/:id/archive` | 게시글 보관 (커스텀) |

### Comments

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/comments` | 댓글 목록 조회 |
| GET | `/comments/:id` | 댓글 상세 조회 |
| POST | `/comments` | 댓글 생성 |
| PATCH | `/comments/:id` | 댓글 수정 |
| DELETE | `/comments/:id` | 댓글 삭제 |

## 쿼리 파라미터 예시

### 필터링

```bash
# 발행된 게시글만 조회
GET /articles?filter[status]=published

# 특정 작성자의 게시글
GET /articles?filter[authorId]=<uuid>

# 특정 날짜 이후 생성된 게시글
GET /articles?filter[createdAt][gte]=2024-01-01
```

### 정렬

```bash
# 생성일 오름차순
GET /articles?sort=createdAt

# 생성일 내림차순
GET /articles?sort=-createdAt

# 복합 정렬
GET /articles?sort=-publishedAt,title
```

### 페이지네이션

```bash
# 처음 10개 조회
GET /articles?page[limit]=10&page[offset]=0

# 다음 10개 조회
GET /articles?page[limit]=10&page[offset]=10
```

### 관계 포함

```bash
# 작성자 정보 포함
GET /articles?include=author

# 작성자와 댓글 포함
GET /articles?include=author,comments

# 댓글의 작성자까지 포함 (중첩)
GET /articles?include=author,comments.author
```

### Sparse Fieldsets

```bash
# 특정 필드만 조회
GET /articles?fields[articles]=title,status,createdAt
```

## 요청/응답 예시

### 게시글 생성

**Request:**
```bash
POST /articles
Content-Type: application/vnd.api+json

{
  "data": {
    "type": "articles",
    "attributes": {
      "title": "새로운 게시글",
      "content": "게시글 내용입니다.",
      "authorId": "<user-uuid>"
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "type": "articles",
    "id": "<article-uuid>",
    "attributes": {
      "title": "새로운 게시글",
      "content": "게시글 내용입니다.",
      "status": "draft",
      "publishedAt": null,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    },
    "relationships": {
      "author": {
        "data": {
          "type": "users",
          "id": "<user-uuid>"
        }
      },
      "comments": {
        "data": []
      }
    }
  }
}
```

### 관계 포함 조회

**Request:**
```bash
GET /articles?include=author,comments.author
```

**Response:**
```json
{
  "data": [
    {
      "type": "articles",
      "id": "<article-uuid>",
      "attributes": {
        "title": "게시글 제목",
        "content": "내용",
        "status": "published"
      },
      "relationships": {
        "author": {
          "data": { "type": "users", "id": "<user-uuid>" }
        },
        "comments": {
          "data": [
            { "type": "comments", "id": "<comment-uuid>" }
          ]
        }
      }
    }
  ],
  "included": [
    {
      "type": "users",
      "id": "<user-uuid>",
      "attributes": {
        "name": "홍길동",
        "email": "hong@example.com"
      }
    },
    {
      "type": "comments",
      "id": "<comment-uuid>",
      "attributes": {
        "body": "좋은 글입니다!"
      },
      "relationships": {
        "author": {
          "data": { "type": "users", "id": "<commenter-uuid>" }
        }
      }
    }
  ]
}
```

## 주요 기능 시연

### 1. Rails-style 훅

```typescript
// BeforeAction/AfterAction 데코레이터 사용
@BeforeAction('authenticate')
@BeforeAction('loadArticle', { only: ['show', 'update', 'delete'] })
@AfterAction('notifySubscribers', { only: ['publish'] })
export class ArticleController extends JsonApiCrudController {
  // ...
}
```

### 2. 라이프사이클 훅

```typescript
protected async beforeCreate(): Promise<void> {
  // 생성 전 로직
  this.model.status = 'draft';
}

protected async afterCreate(): Promise<void> {
  // 생성 후 로직 (this.record에 저장된 엔티티)
  console.log(`Created: ${this.record?.id}`);
}
```

### 3. 커스텀 액션

```typescript
@Post(':id/publish')
@JsonApiAction('publish')
async publish(@Param('id') id: string) {
  return this.executeAction('publish', async () => {
    const updated = await this.prismaAdapter.update(
      'article',
      { id },
      { status: 'published', publishedAt: new Date() }
    );
    return this.serializerService.serializeOne(updated, ArticleSerializer);
  });
}
```

### 4. 쿼리 화이트리스트

```typescript
@JsonApiController({
  model: 'article',
  serializer: ArticleSerializer,
  query: {
    allowedFilters: ['status', 'authorId'],
    allowedSorts: ['createdAt', '-createdAt', 'title'],
    allowedIncludes: ['author', 'comments'],
    maxIncludeDepth: 2,
    onDisallowed: 'error', // 허용되지 않은 쿼리 시 에러 발생
  },
})
```

## 프로젝트 구조

```
packages/example/
├── prisma/
│   ├── schema.prisma      # 데이터베이스 스키마
│   └── seed.ts            # 시드 데이터
├── src/
│   ├── prisma/            # Prisma 서비스
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── users/             # 사용자 모듈
│   │   ├── dto/
│   │   ├── user.controller.ts
│   │   ├── user.module.ts
│   │   └── user.serializer.ts
│   ├── articles/          # 게시글 모듈
│   │   ├── dto/
│   │   ├── article.controller.ts
│   │   ├── article.module.ts
│   │   └── article.serializer.ts
│   ├── comments/          # 댓글 모듈
│   │   ├── dto/
│   │   ├── comment.controller.ts
│   │   ├── comment.module.ts
│   │   └── comment.serializer.ts
│   ├── app.module.ts      # 루트 모듈
│   └── main.ts            # 진입점
├── package.json
├── tsconfig.json
└── nest-cli.json
```

## 라이선스

MIT
