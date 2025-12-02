import {
  Controller,
  Get,
  Param,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { JSON_API_MODULE_OPTIONS } from '../constants';
import { JsonApiModuleOptions } from '../interfaces';
import { ServerConfigAuthGuard } from '../guards/server-config-auth.guard';
import { ControllerRegistryService } from '../services/controller-registry.service';
import { ServerConfigResponse, ResourceConfigInfo } from '../interfaces/server-config.interface';

/**
 * ServerConfigController
 *
 * 경로는 RouterModule을 통해 동적으로 설정됩니다.
 * @Controller() 데코레이터의 경로는 비워두고 RouterModule에서 prefix 적용.
 *
 * 설계 결정 - 응답 형식:
 * 이 API는 의도적으로 JSON:API 형식을 따르지 않습니다.
 *
 * 이유:
 * 1. 메타 정보 제공이 목적 - 리소스 CRUD가 아닌 설정 정보 조회용
 * 2. 간결한 응답 - JSON:API 래핑(data, attributes 등) 없이 직접적인 구조
 * 3. 프론트엔드 개발 편의 - 복잡한 파싱 없이 바로 사용 가능
 * 4. 분리된 관심사 - 애플리케이션 리소스와 메타 정보의 명확한 구분
 *
 * JSON:API 형식이 필요한 경우 별도 요청 시 지원 검토 가능
 */
@Controller()
@UseGuards(ServerConfigAuthGuard)
export class ServerConfigController {
  constructor(
    @Inject(JSON_API_MODULE_OPTIONS)
    private readonly moduleOptions: JsonApiModuleOptions,
    private readonly registry: ControllerRegistryService,
  ) {}

  /**
   * GET /server-config (또는 커스텀 경로)
   * 전체 리소스 목록 및 모듈 설정 조회
   */
  @Get()
  getAll(): ServerConfigResponse {
    const resources: ResourceConfigInfo[] = [];
    for (const [model] of this.registry.getAll()) {
      resources.push(this.registry.buildResourceConfig(model, this.moduleOptions));
    }

    return {
      version: '1.0.0',
      global: {
        baseUrl: this.moduleOptions.baseUrl,
        idType: this.moduleOptions.idType ?? 'string',
        pagination: {
          defaultLimit: this.moduleOptions.pagination?.defaultLimit ?? 20,
          maxLimit: this.moduleOptions.pagination?.maxLimit ?? 100,
        },
      },
      resources,
    };
  }

  /**
   * GET /server-config/:model (또는 커스텀 경로)
   * 특정 모델의 상세 설정 조회
   *
   * 참고: buildResourceConfig 내부에서 모델 존재 여부를 확인하고
   * NotFoundException을 던지므로 별도 검증 불필요
   */
  @Get(':model')
  getByModel(@Param('model') model: string): ResourceConfigInfo {
    // buildResourceConfig가 모델 미존재 시 NotFoundException을 던짐
    return this.registry.buildResourceConfig(model, this.moduleOptions);
  }
}
