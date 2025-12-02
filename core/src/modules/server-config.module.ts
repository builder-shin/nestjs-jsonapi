import { Module } from '@nestjs/common';
import { ServerConfigController } from '../controllers/server-config.controller';

/**
 * ServerConfigModule
 *
 * 동적 경로 지원을 위해 별도 모듈로 분리.
 * RouterModule을 통해 커스텀 경로 prefix 적용.
 *
 * 의존성 흐름:
 * ```
 * JsonApiModule (global: true)
 *   +-- DiscoveryModule (DiscoveryService 제공)
 *   +-- JSON_API_MODULE_OPTIONS (global provider)
 *   +-- ControllerRegistryService (global provider)
 *   +-- ServerConfigModule
 *         +-- ServerConfigController
 *               +-- JSON_API_MODULE_OPTIONS (JsonApiModule에서 주입)
 *               +-- ControllerRegistryService (JsonApiModule에서 주입)
 * ```
 *
 * 주의:
 * - ControllerRegistryService와 JSON_API_MODULE_OPTIONS는 JsonApiModule에서 global로 제공
 * - DiscoveryModule은 JsonApiModule에서만 import (중복 방지)
 * - ServerConfigModule은 자체 providers 없이 JsonApiModule의 global providers 사용
 */
@Module({
  controllers: [ServerConfigController],
  // providers에 ControllerRegistryService 미등록 - JsonApiModule에서 global로 제공
  // DiscoveryModule은 JsonApiModule에서 import - 중복 방지
})
export class ServerConfigModule {}
