import { JsonApiCrudController, PrismaAdapterService, JsonApiQueryService, JsonApiSerializerService, JsonApiModuleOptions } from "@builder-shin/nestjs-jsonapi";
export declare class CommentController extends JsonApiCrudController {
    private readonly _prismaAdapter;
    private readonly _queryService;
    private readonly _serializerService;
    private readonly _moduleOptions;
    constructor(_prismaAdapter: PrismaAdapterService, _queryService: JsonApiQueryService, _serializerService: JsonApiSerializerService, _moduleOptions: JsonApiModuleOptions);
    protected get prismaAdapter(): PrismaAdapterService;
    protected get queryService(): JsonApiQueryService;
    protected get serializerService(): JsonApiSerializerService;
    protected get moduleOptions(): JsonApiModuleOptions;
    protected logRequest(): Promise<void>;
    protected beforeCreate(): Promise<void>;
    protected afterCreate(): Promise<void>;
    protected beforeDelete(): Promise<void>;
}
