# NestJS JSON:API Example

An example application using the `@builder-shin/nestjs-jsonapi` package.

## Overview

This example implements a blog system with the following resources:

- **Users** - User management
- **Articles** - Article management (with custom actions)
- **Comments** - Comment management

## Getting Started

### 1. Install Dependencies

```bash
# Run from the root directory
pnpm install
```

### 2. Database Setup

```bash
cd packages/example

# Generate Prisma client
pnpm prisma:generate

# Run database migrations
pnpm prisma:migrate

# Seed the database
pnpm prisma:seed
```

### 3. Run the Application

```bash
# Development mode
pnpm start:dev

# Production build
pnpm build
pnpm start:prod
```

## API Endpoints

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | Get user list |
| GET | `/users/:id` | Get user details |
| POST | `/users` | Create a user |
| PATCH | `/users/:id` | Update a user |
| DELETE | `/users/:id` | Delete a user |

### Articles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/articles` | Get article list |
| GET | `/articles/:id` | Get article details |
| POST | `/articles` | Create an article |
| POST | `/articles/_bulk/create` | Bulk create articles |
| PATCH | `/articles/:id` | Update an article |
| DELETE | `/articles/:id` | Delete an article |
| POST | `/articles/:id/publish` | Publish article (custom) |
| POST | `/articles/:id/archive` | Archive article (custom) |

### Comments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/comments` | Get comment list |
| GET | `/comments/:id` | Get comment details |
| POST | `/comments` | Create a comment |
| PATCH | `/comments/:id` | Update a comment |
| DELETE | `/comments/:id` | Delete a comment |

## Query Parameter Examples

### Filtering

```bash
# Get only published articles
GET /articles?filter[status]=published

# Get articles by a specific author
GET /articles?filter[authorId]=<uuid>

# Get articles created after a specific date
GET /articles?filter[createdAt][gte]=2024-01-01
```

### Sorting

```bash
# Sort by creation date ascending
GET /articles?sort=createdAt

# Sort by creation date descending
GET /articles?sort=-createdAt

# Multi-field sorting
GET /articles?sort=-publishedAt,title
```

### Pagination

```bash
# Get first 10 items
GET /articles?page[limit]=10&page[offset]=0

# Get next 10 items
GET /articles?page[limit]=10&page[offset]=10
```

### Including Relationships

```bash
# Include author information
GET /articles?include=author

# Include author and comments
GET /articles?include=author,comments

# Include nested relationships (comment authors)
GET /articles?include=author,comments.author
```

### Sparse Fieldsets

```bash
# Get only specific fields
GET /articles?fields[articles]=title,status,createdAt
```

## Request/Response Examples

### Create Article

**Request:**
```bash
POST /articles
Content-Type: application/vnd.api+json

{
  "data": {
    "type": "articles",
    "attributes": {
      "title": "New Article",
      "content": "This is the article content.",
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
      "title": "New Article",
      "content": "This is the article content.",
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

### Query with Included Relationships

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
        "title": "Article Title",
        "content": "Content",
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
        "name": "John Doe",
        "email": "john@example.com"
      }
    },
    {
      "type": "comments",
      "id": "<comment-uuid>",
      "attributes": {
        "body": "Great article!"
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

## Key Feature Demonstrations

### 1. Rails-style Hooks

```typescript
// Using BeforeAction/AfterAction decorators
@BeforeAction('authenticate')
@BeforeAction('loadArticle', { only: ['show', 'update', 'delete'] })
@AfterAction('notifySubscribers', { only: ['publish'] })
export class ArticleController extends JsonApiCrudController {
  // ...
}
```

### 2. Lifecycle Hooks

```typescript
protected async beforeCreate(): Promise<void> {
  // Pre-create logic
  this.model.status = 'draft';
}

protected async afterCreate(): Promise<void> {
  // Post-create logic (saved entity in this.record)
  console.log(`Created: ${this.record?.id}`);
}
```

### 3. Custom Actions

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

### 4. Query Whitelist

```typescript
@JsonApiController({
  model: 'article',
  serializer: ArticleSerializer,
  query: {
    allowedFilters: ['status', 'authorId'],
    allowedSorts: ['createdAt', '-createdAt', 'title'],
    allowedIncludes: ['author', 'comments'],
    maxIncludeDepth: 2,
    onDisallowed: 'error', // Throw error on disallowed query parameters
  },
})
```

## Project Structure

```
packages/example/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed data
├── src/
│   ├── prisma/            # Prisma service
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── users/             # User module
│   │   ├── dto/
│   │   ├── user.controller.ts
│   │   ├── user.module.ts
│   │   └── user.serializer.ts
│   ├── articles/          # Article module
│   │   ├── dto/
│   │   ├── article.controller.ts
│   │   ├── article.module.ts
│   │   └── article.serializer.ts
│   ├── comments/          # Comment module
│   │   ├── dto/
│   │   ├── comment.controller.ts
│   │   ├── comment.module.ts
│   │   └── comment.serializer.ts
│   ├── app.module.ts      # Root module
│   └── main.ts            # Entry point
├── package.json
├── tsconfig.json
└── nest-cli.json
```

## License

MIT
