# @builder-shin/nestjs-jsonapi

> A NestJS 11+ package for automatic JSON:API 1.1 compliant CRUD generation with Prisma ORM integration.

[![npm version](https://img.shields.io/npm/v/@builder-shin/nestjs-jsonapi.svg)](https://www.npmjs.com/package/@builder-shin/nestjs-jsonapi)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **JSON:API 1.1 Specification Compliant** - Full adherence to the JSON:API specification
- **Automatic CRUD Generation** - Zero boilerplate for standard operations
- **Prisma ORM Integration** - Seamless integration with Prisma 5.x/6.x
- **Rails-style Hooks** - `@BeforeAction` / `@AfterAction` decorators for lifecycle management
- **Query Whitelisting** - Security-first filtering, sorting, and include control
- **Bulk Operations** - Built-in support for batch create, update, upsert, and delete
- **Flexible Serialization** - Customizable serializers with relationship support
- **Server Config API** - Runtime resource metadata for frontend development
- **Type Safety** - Full TypeScript support with strict mode

## Requirements

| Dependency | Version |
|------------|---------|
| Node.js | ≥20.0.0 |
| NestJS | ≥11.0.0 |
| Prisma Client | ≥5.0.0 or ≥6.0.0 |
| TypeScript | ≥5.x |

## Installation

```bash
# npm
npm install @builder-shin/nestjs-jsonapi

# pnpm
pnpm add @builder-shin/nestjs-jsonapi

# yarn
yarn add @builder-shin/nestjs-jsonapi
```

### Peer Dependencies

Make sure you have the following peer dependencies installed:

```bash
npm install @nestjs/common @nestjs/core @prisma/client class-transformer class-validator reflect-metadata rxjs
```

## Quick Start

### 1. Configure the Module

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { JsonApiModule } from '@builder-shin/nestjs-jsonapi';
import { PrismaService } from './prisma.service';

@Module({
  imports: [
    JsonApiModule.forRoot({
      pagination: {
        defaultLimit: 20,
        maxLimit: 100,
      },
      baseUrl: 'https://api.example.com',
      prismaServiceToken: PrismaService,
      idType: 'uuid', // 'string' | 'number' | 'uuid' | 'cuid' | 'auto'
      debug: false,
    }),
  ],
})
export class AppModule {}
```

### 2. Create a Serializer

```typescript
// article.serializer.ts
import { JsonApiSerializer, Attribute, Relationship } from '@builder-shin/nestjs-jsonapi';

@JsonApiSerializer('articles')
export class ArticleSerializer {
  @Attribute()
  title: string;

  @Attribute()
  content: string;

  @Attribute()
  createdAt: Date;

  @Relationship(() => UserSerializer)
  author: any;

  @Relationship(() => CommentSerializer)
  comments: any[];
}
```

### 3. Create DTOs

```typescript
// create-article.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateArticleDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  authorId?: string;
}

// update-article.dto.ts
export class UpdateArticleDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;
}
```

### 4. Create a Controller

```typescript
// article.controller.ts
import { Controller, Inject } from '@nestjs/common';
import {
  JsonApiController,
  JsonApiCrudController,
  BeforeAction,
  AfterAction,
  PrismaAdapterService,
  JsonApiQueryService,
  JsonApiSerializerService,
  JsonApiModuleOptions,
  JSON_API_MODULE_OPTIONS,
} from '@builder-shin/nestjs-jsonapi';
import { ArticleSerializer } from './article.serializer';
import { CreateArticleDto, UpdateArticleDto } from './dto';

@Controller('articles')
@JsonApiController({
  model: 'article',
  serializer: ArticleSerializer,
  dto: {
    create: CreateArticleDto,
    update: UpdateArticleDto,
  },
  only: ['index', 'show', 'create', 'update', 'delete'],
  query: {
    allowedFilters: ['status', 'authorId', 'createdAt'],
    allowedSorts: ['createdAt', '-updatedAt', 'title'],
    allowedIncludes: ['author', 'comments'],
    maxIncludeDepth: 2,
    onDisallowed: 'error',
  },
})
@BeforeAction('authenticate')
@BeforeAction('setArticle', { only: ['show', 'update', 'delete'] })
@AfterAction('logActivity', { except: ['index', 'show'] })
export class ArticleController extends JsonApiCrudController {
  constructor(
    private readonly _prismaAdapter: PrismaAdapterService,
    private readonly _queryService: JsonApiQueryService,
    private readonly _serializerService: JsonApiSerializerService,
    @Inject(JSON_API_MODULE_OPTIONS)
    private readonly _moduleOptions: JsonApiModuleOptions,
  ) {
    super();
  }

  // Required: Implement abstract getters
  protected get prismaAdapter() { return this._prismaAdapter; }
  protected get queryService() { return this._queryService; }
  protected get serializerService() { return this._serializerService; }
  protected get moduleOptions() { return this._moduleOptions; }

  // Lifecycle hooks
  protected async authenticate(): Promise<void> {
    // Authentication logic
  }

  protected async setArticle(): Promise<void> {
    // Load and set article record
  }

  protected async logActivity(): Promise<void> {
    // Activity logging logic
  }

  // Override lifecycle hooks
  protected async beforeCreate(): Promise<void> {
    // Modify this.model before saving
    this.model.status = 'draft';
  }

  protected async afterCreate(): Promise<void> {
    // Post-creation logic (this.record contains saved entity)
  }
}
```

## API Reference

### JsonApiModule

#### `forRoot(options: JsonApiModuleOptions)`

Synchronous module configuration.

```typescript
interface JsonApiModuleOptions {
  pagination: {
    defaultLimit: number;  // Default page size
    maxLimit: number;      // Maximum allowed page size
  };
  baseUrl?: string;                    // API base URL for links
  prismaServiceToken?: string | symbol; // Prisma service injection token
  idType?: 'string' | 'number' | 'uuid' | 'cuid' | 'auto';
  debug?: boolean;                     // Enable debug logging
  serverConfig?: {
    enabled: boolean;                  // Enable Server Config API
    password: string;                  // Bearer token password (required if enabled)
    path?: string;                     // API path (default: 'server-config')
    detailLevel?: 'minimal' | 'standard' | 'full';  // Response detail level
  };
}
```

#### `forRootAsync(options: JsonApiModuleAsyncOptions)`

Asynchronous module configuration with factory function.

```typescript
JsonApiModule.forRootAsync({
  imports: [ConfigModule, PrismaModule],
  prismaServiceToken: PrismaService,
  useFactory: (config: ConfigService) => ({
    pagination: {
      defaultLimit: config.get('PAGINATION_DEFAULT_LIMIT', 20),
      maxLimit: config.get('PAGINATION_MAX_LIMIT', 100),
    },
    baseUrl: config.get('API_BASE_URL'),
  }),
  inject: [ConfigService],
})
```

### Decorators

#### `@JsonApiController(options)`

Configures a controller for JSON:API CRUD operations.

```typescript
interface JsonApiControllerOptions {
  model: string;           // Prisma model name (lowercase)
  serializer: Type<any>;   // Serializer class
  dto?: {
    create?: Type<any>;    // Create DTO class
    update?: Type<any>;    // Update DTO class
  };
  only?: ActionType[];     // Enable only these actions
  except?: ActionType[];   // Disable these actions
  type?: string;           // JSON:API resource type (default: pluralized model)
  query?: QueryWhitelistOptions;  // Query parameter whitelist
}

type ActionType =
  | 'index' | 'show' | 'create' | 'createMany'
  | 'update' | 'updateMany' | 'upsert' | 'upsertMany'
  | 'delete' | 'deleteMany' | string;
```

#### `@JsonApiSerializer(type)`

Defines a JSON:API serializer class.

```typescript
@JsonApiSerializer('articles')
export class ArticleSerializer {
  // ...
}
```

#### `@Attribute(options?)`

Marks a property as a JSON:API attribute.

```typescript
@Attribute()
title: string;

@Attribute({ serializedName: 'created_at' })
createdAt: Date;
```

#### `@Relationship(serializerFn, options?)`

Defines a relationship to another resource.

```typescript
@Relationship(() => UserSerializer)
author: any;

@Relationship(() => CommentSerializer)
comments: any[];
```

#### `@BeforeAction(methodName, options?)`

Rails-style before_action hook.

```typescript
// Apply to all actions
@BeforeAction('authenticate')

// Apply to specific actions
@BeforeAction('loadRecord', { only: ['show', 'update', 'delete'] })

// Exclude from specific actions
@BeforeAction('logRequest', { except: ['index'] })

// Multiple methods
@BeforeAction('authenticate', 'authorize', 'loadTenant')
```

#### `@AfterAction(methodName, options?)`

Rails-style after_action hook.

```typescript
@AfterAction('logActivity', { except: ['index', 'show'] })
```

#### `@JsonApiAction(name)`

Defines a custom action for use with hooks.

```typescript
@Post(':id/publish')
@JsonApiAction('publish')
async publish(@Param('id') id: string) {
  return this.executeAction('publish', async () => {
    // Custom action logic
  });
}
```

### JsonApiCrudController

Abstract base controller providing CRUD operations.

#### Protected Properties

| Property | Type | Description |
|----------|------|-------------|
| `model` | `Record<string, unknown>` | Current model instance (DTO filtered & validated) |
| `record` | `Record<string, unknown> \| null` | DB record (for show/update/delete) |
| `request` | `Request` | Current Express request |
| `parsedQuery` | `ParsedQuery` | Parsed query parameters |
| `currentAction` | `string` | Current action name |

#### Abstract Getters (Required)

```typescript
protected abstract get prismaAdapter(): PrismaAdapterService;
protected abstract get queryService(): JsonApiQueryService;
protected abstract get serializerService(): JsonApiSerializerService;
protected abstract get moduleOptions(): JsonApiModuleOptions;
```

#### Lifecycle Hooks (Override as needed)

```typescript
protected async beforeIndex(): Promise<void> {}
protected async afterIndex(_records: any[]): Promise<void> {}
protected async beforeShow(): Promise<void> {}
protected async afterShow(): Promise<void> {}
protected async beforeCreate(): Promise<void> {}
protected async afterCreate(): Promise<void> {}
protected async beforeUpdate(): Promise<void> {}
protected async afterUpdate(): Promise<void> {}
protected async beforeDelete(): Promise<void> {}
protected async afterDelete(): Promise<void> {}
protected async beforeUpsert(): Promise<void> {}
protected async afterUpsert(): Promise<void> {}
```

### CRUD Endpoints

| Method | Path | Action | Description |
|--------|------|--------|-------------|
| GET | `/` | index | List resources with pagination |
| GET | `/:id` | show | Get single resource |
| POST | `/` | create | Create single resource |
| POST | `/_bulk/create` | createMany | Bulk create (atomic) |
| PATCH | `/:id` | update | Update single resource |
| PATCH | `/_bulk/update` | updateMany | Bulk update |
| PUT | `/:id` | upsert | Upsert single resource |
| PUT | `/_bulk/upsert` | upsertMany | Bulk upsert (atomic) |
| DELETE | `/:id` | delete | Delete single resource |
| POST | `/_bulk/delete` | deleteMany | Bulk delete (atomic) |

### Query Parameters

```
# Filtering
GET /articles?filter[status]=published
GET /articles?filter[createdAt][gte]=2024-01-01

# Sorting (prefix - for descending)
GET /articles?sort=createdAt,-updatedAt

# Pagination
GET /articles?page[offset]=0&page[limit]=20

# Include relationships
GET /articles?include=author,comments

# Sparse fieldsets
GET /articles?fields[articles]=title,content
```

### Query Whitelisting

Restrict allowed query parameters for security and performance:

```typescript
query: {
  allowedFilters: ['status', 'authorId', 'createdAt'],
  allowedSorts: ['createdAt', '-updatedAt', 'title'],
  allowedIncludes: ['author', 'comments', 'comments.author'],
  allowedFields: {
    articles: ['title', 'content', 'createdAt'],
    users: ['name', 'email'],
  },
  maxIncludeDepth: 2,
  onDisallowed: 'error', // 'error' | 'ignore'
}
```

### Server Config API

런타임에 등록된 리소스의 메타정보를 조회할 수 있는 API입니다. 프론트엔드 개발자가 허용된 필터, 정렬, include 등을 확인할 수 있습니다.

#### 활성화

```typescript
JsonApiModule.forRoot({
  // ... 기존 설정
  serverConfig: {
    enabled: true,
    password: 'your-secret-password',  // 필수 (enabled=true 시)
    path: 'server-config',              // 선택 (기본값: 'server-config')
    detailLevel: 'standard',            // 'minimal' | 'standard' | 'full'
  },
})
```

#### 엔드포인트

```bash
# 전체 리소스 목록 조회
curl -H "Authorization: Bearer your-secret-password" \
  https://api.example.com/server-config

# 특정 모델 상세 조회
curl -H "Authorization: Bearer your-secret-password" \
  https://api.example.com/server-config/article
```

#### 응답 예시

```json
{
  "version": "1.0.0",
  "global": {
    "baseUrl": "https://api.example.com",
    "idType": "string",
    "pagination": { "defaultLimit": 20, "maxLimit": 100 }
  },
  "resources": [
    {
      "model": "article",
      "type": "articles",
      "idType": "uuid",
      "enabledActions": ["index", "show", "create", "update", "delete"],
      "pagination": { "defaultLimit": 20, "maxLimit": 100 },
      "query": {
        "allowedFilters": ["status", "authorId"],
        "allowedSorts": ["createdAt", "-updatedAt"],
        "allowedIncludes": ["author", "comments"]
      },
      "relationships": {
        "author": { "type": "users", "cardinality": "one" },
        "comments": { "type": "comments", "cardinality": "many" }
      }
    }
  ]
}
```

#### detailLevel 별 응답 필드

| 필드 | minimal | standard | full |
|------|---------|----------|------|
| `model`, `type`, `idType`, `enabledActions`, `pagination` | ✅ | ✅ | ✅ |
| `query`, `relationships` | ❌ | ✅ | ✅ |
| `validation` (DTO 검증 규칙) | ❌ | ❌ | ✅ |

### Services

#### PrismaAdapterService

Abstracts Prisma CRUD operations.

```typescript
// Query operations
findMany(model: string, options?: PrismaFindOptions): Promise<any[]>
findOne(model: string, options?: PrismaFindOneOptions): Promise<any | null>
findFirst(model: string, options?: PrismaFindOptions): Promise<any | null>
count(model: string, where?: Record<string, unknown>): Promise<number>

// Single record operations
create(model: string, data: Record<string, unknown>): Promise<any>
update(model: string, where: Record<string, unknown>, data: Record<string, unknown>): Promise<any>
upsert(model: string, where: Record<string, unknown>, create: Record<string, unknown>, update: Record<string, unknown>): Promise<any>
delete(model: string, where: Record<string, unknown>): Promise<any>

// Bulk operations
createMany(model: string, data: Record<string, unknown>[]): Promise<{ count: number }>
createManyAndReturn(model: string, data: Record<string, unknown>[]): Promise<any[]>
updateMany(model: string, where: Record<string, unknown>, data: Record<string, unknown>): Promise<{ count: number }>
deleteMany(model: string, where: Record<string, unknown>): Promise<{ count: number }>

// Transaction & utilities
transaction<T>(fn: (tx: any) => Promise<T>): Promise<T>
setPrismaClient(client: any): void
```

#### JsonApiQueryService

Parses JSON:API query parameters and converts to Prisma options.

```typescript
parse(request: Request): ParsedQuery
parseWithWhitelist(request: Request, whitelist?: QueryWhitelistOptions): { parsed: ParsedQuery; errors: string[] }
toPrismaOptions(query: ParsedQuery, model: string): PrismaQueryOptions
```

#### JsonApiSerializerService

Serializes data to JSON:API format.

```typescript
serializeOne(data: any, serializer: Type<any>, options?: SerializeOptions): JsonApiDocument
serializeMany(data: any[], serializer: Type<any>, options?: SerializeOptions): JsonApiDocument
serializeNull(meta?: Record<string, unknown>): JsonApiDocument
```

#### ControllerRegistryService

Collects and manages `@JsonApiController` metadata using NestJS DiscoveryService.

```typescript
getAll(): Map<string, { controllerClass: Type<any>; options: JsonApiControllerOptions }>
getByModel(model: string): JsonApiControllerOptions | undefined
buildResourceConfig(model: string, moduleOptions: JsonApiModuleOptions): ResourceConfigInfo
```

### Exceptions

#### JsonApiValidationException

Thrown when DTO validation fails.

```typescript
throw new JsonApiValidationException(validationErrors);
```

#### JsonApiQueryException

Thrown when query parameter validation fails.

```typescript
throw new JsonApiQueryException([
  JsonApiQueryException.disallowedFilter('fieldName'),
  JsonApiQueryException.disallowedSort('fieldName'),
  JsonApiQueryException.disallowedInclude('relationName'),
  JsonApiQueryException.disallowedField('fieldName', 'resourceType'),
  JsonApiQueryException.includeDepthExceeded('path', maxDepth),
]);
```

## Project Structure

```
packages/core/src/
├── constants/           # Metadata symbol constants
├── interfaces/          # JSON:API, filter, module options, server-config types
├── utils/               # Naming, query parsing, ID conversion
├── decorators/          # @JsonApiController, @Attribute, @BeforeAction, etc.
├── services/            # PrismaAdapter, QueryService, SerializerService, ControllerRegistry
├── exceptions/          # JSON:API format exceptions
├── dto/                 # Body/Query DTOs
├── pipes/               # JsonApiBodyPipe
├── guards/              # Content-Type, ServerConfigAuth guards
├── interceptors/        # Response header interceptor
├── filters/             # Exception filter
├── controllers/         # JsonApiCrudController, ServerConfigController
├── modules/             # ServerConfigModule
├── types/               # TypeScript type declarations
├── json-api.module.ts   # Module definition
└── index.ts             # Barrel export
```

## Examples

### Custom Action with Hooks

```typescript
@Controller('articles')
@JsonApiController({
  model: 'article',
  serializer: ArticleSerializer,
})
@BeforeAction('authenticate')
@BeforeAction('loadArticle', { only: ['show', 'update', 'delete', 'publish', 'archive'] })
@AfterAction('sendNotification', { only: ['publish'] })
export class ArticleController extends JsonApiCrudController {
  // ... service injections ...

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

  @Post(':id/archive')
  @JsonApiAction('archive')
  async archive(@Param('id') id: string) {
    return this.executeAction('archive', async () => {
      const updated = await this.prismaAdapter.update(
        'article',
        { id },
        { status: 'archived' }
      );
      return this.serializerService.serializeOne(updated, ArticleSerializer);
    });
  }

  protected async loadArticle(): Promise<void> {
    // this.record is populated by findRecord
  }

  protected async sendNotification(): Promise<void> {
    // Send notification after publish
  }
}
```

### Relationship Serialization

```typescript
@JsonApiSerializer('articles')
export class ArticleSerializer {
  @Attribute()
  title: string;

  @Relationship(() => UserSerializer, {
    links: { self: '/articles/{id}/relationships/author' }
  })
  author: any;

  @Relationship(() => CommentSerializer)
  comments: any[];
}

@JsonApiSerializer('users')
export class UserSerializer {
  @Attribute()
  name: string;

  @Attribute()
  email: string;
}

@JsonApiSerializer('comments')
export class CommentSerializer {
  @Attribute()
  body: string;

  @Relationship(() => UserSerializer)
  author: any;
}
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Author

builder-shin

## Links

- [GitHub Repository](https://github.com/builder-shin/nestjs-jsonapi)
- [npm Package](https://www.npmjs.com/package/@builder-shin/nestjs-jsonapi)
- [JSON:API Specification](https://jsonapi.org/)
