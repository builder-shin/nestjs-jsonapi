/**
 * Controller Registry Service
 *
 * DiscoveryService를 사용하여 @JsonApiController 데코레이터가 적용된
 * 컨트롤러의 메타데이터를 수집하고 관리합니다.
 *
 * @packageDocumentation
 * @module services
 */

import { Injectable, OnModuleInit, Type, NotFoundException } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
// class-validator는 선택적 의존성 - extractValidationRules에서 동적 로드
import { JSON_API_CONTROLLER_OPTIONS } from '../constants';
import { JsonApiControllerOptions } from '../interfaces';
import { JsonApiModuleOptions, IdType } from '../interfaces/module-options.interface';
import { ResourceConfigInfo, ValidationRule } from '../interfaces/server-config.interface';

/**
 * 컨트롤러 레지스트리 서비스
 *
 * NestJS의 DiscoveryService를 사용하여 모듈 초기화 시점에
 * @JsonApiController 데코레이터가 적용된 컨트롤러의 메타데이터를 수집합니다.
 *
 * @example
 * ```typescript
 * // 모든 등록된 컨트롤러 조회
 * const controllers = this.registry.getAll();
 *
 * // 특정 모델의 컨트롤러 조회
 * const articleOptions = this.registry.getByModel('article');
 *
 * // 리소스 설정 정보 생성
 * const config = this.registry.buildResourceConfig('article', moduleOptions);
 * ```
 */
@Injectable()
export class ControllerRegistryService implements OnModuleInit {
  private controllers = new Map<
    string,
    {
      controllerClass: Type<any>;
      options: JsonApiControllerOptions;
    }
  >();

  constructor(private readonly discovery: DiscoveryService) {}

  /**
   * 모듈 초기화 시 DiscoveryService를 통해 컨트롤러 수집
   */
  onModuleInit(): void {
    const controllers = this.discovery.getControllers();

    for (const wrapper of controllers) {
      const { instance, metatype } = wrapper;
      // 타입 안전성: metatype이 함수인지 확인
      if (!instance || !metatype || typeof metatype !== 'function') continue;

      // JsonApiController 데코레이터의 메타데이터 확인
      const options = Reflect.getMetadata(
        JSON_API_CONTROLLER_OPTIONS,
        metatype as Type<any>,
      );
      if (options) {
        this.controllers.set(options.model, {
          controllerClass: metatype as Type<any>,
          options,
        });
      }
    }
  }

  /**
   * 모든 등록된 컨트롤러 조회
   */
  getAll(): Map<
    string,
    { controllerClass: Type<any>; options: JsonApiControllerOptions }
  > {
    return this.controllers;
  }

  /**
   * 특정 모델의 컨트롤러 조회
   */
  getByModel(model: string): JsonApiControllerOptions | undefined {
    return this.controllers.get(model)?.options;
  }

  /**
   * 리소스 설정 정보 생성 (detailLevel에 따른 분기 로직 포함)
   * @throws NotFoundException 모델을 찾을 수 없는 경우
   */
  buildResourceConfig(
    model: string,
    moduleOptions: JsonApiModuleOptions,
  ): ResourceConfigInfo {
    const entry = this.controllers.get(model);
    if (!entry) {
      throw new NotFoundException(`Model '${model}' not found`);
    }

    const { options } = entry;
    const detailLevel = moduleOptions.serverConfig?.detailLevel ?? 'standard';

    // 기본 정보 (minimal)
    const config: ResourceConfigInfo = {
      model,
      type: this.resolveType(options),
      idType: this.resolveIdType(options, moduleOptions),
      enabledActions: this.resolveEnabledActions(options),
      pagination: {
        defaultLimit: moduleOptions.pagination?.defaultLimit ?? 20,
        maxLimit: moduleOptions.pagination?.maxLimit ?? 100,
      },
    };

    // standard 이상: 쿼리 설정 및 관계 정보 포함
    if (detailLevel === 'standard' || detailLevel === 'full') {
      config.query = {
        allowedFilters: options.query?.allowedFilters ?? [],
        allowedSorts: options.query?.allowedSorts ?? [],
        allowedIncludes: options.query?.allowedIncludes ?? [],
        maxIncludeDepth: options.query?.maxIncludeDepth ?? 2,
        allowedFields: options.query?.allowedFields,
        // 기존 QueryWhitelistOptions.onDisallowed 필드 반영
        onDisallowed: options.query?.onDisallowed ?? 'ignore',
      };

      config.relationships = this.resolveRelationships(options);
    }

    // full: DTO 검증 규칙 포함
    if (detailLevel === 'full') {
      config.validation = this.resolveValidationRules(options);
    }

    return config;
  }

  private resolveType(options: JsonApiControllerOptions): string {
    // 명시적 type 또는 모델명 pluralize
    return options.type ?? this.pluralize(options.model.toLowerCase());
  }

  private resolveIdType(
    options: JsonApiControllerOptions,
    moduleOptions: JsonApiModuleOptions,
  ): IdType {
    return options.idType ?? moduleOptions.idType ?? 'string';
  }

  private resolveEnabledActions(options: JsonApiControllerOptions): string[] {
    // 기존 CRUD_ACTIONS 상수 사용 (10개 액션)
    const defaultActions = [
      'index',
      'show',
      'create',
      'createMany',
      'update',
      'updateMany',
      'upsert',
      'upsertMany',
      'delete',
      'deleteMany',
    ];

    if (options.only) {
      return options.only;
    }
    if (options.except) {
      return defaultActions.filter(
        (action) => !options.except!.includes(action as any),
      );
    }
    return defaultActions;
  }

  private resolveRelationships(
    options: JsonApiControllerOptions,
  ): Record<string, { type: string; cardinality: 'one' | 'many' }> | undefined {
    // relationships 옵션이 있으면 변환
    // JsonApiControllerOptions.relationships 구조:
    // {
    //   author: { type: 'users', many: false },
    //   comments: { type: 'comments', many: true }
    // }
    if (!options.relationships) return undefined;

    const result: Record<string, { type: string; cardinality: 'one' | 'many' }> =
      {};
    for (const [key, rel] of Object.entries(options.relationships)) {
      // rel.type: 관계 대상의 JSON:API 리소스 타입명 (예: 'users', 'comments')
      // rel.many: true이면 to-many 관계, false/undefined이면 to-one 관계
      result[key] = {
        type: rel.type, // JSON:API 리소스 타입명
        cardinality: rel.many ? 'many' : 'one',
      };
    }
    return result;
  }

  private resolveValidationRules(options: JsonApiControllerOptions): {
    create?: Record<string, ValidationRule>;
    update?: Record<string, ValidationRule>;
  } | undefined {
    // DTO 클래스에서 class-validator 메타데이터 추출
    const result: {
      create?: Record<string, ValidationRule>;
      update?: Record<string, ValidationRule>;
    } = {};

    if (options.dto?.create) {
      result.create = this.extractValidationRules(options.dto.create);
    }
    if (options.dto?.update) {
      result.update = this.extractValidationRules(options.dto.update);
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  private extractValidationRules(
    dtoClass: Type<any>,
  ): Record<string, ValidationRule> {
    // class-validator 메타데이터에서 검증 규칙 추출
    // class-validator는 선택적 의존성으로 동적 로드 (설치되지 않은 환경 지원)
    const rules: Record<string, ValidationRule> = {};

    try {
      // 동적 require로 선택적 의존성 처리
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getMetadataStorage } = require('class-validator') as {
        getMetadataStorage: () => {
          getTargetValidationMetadatas: (
            targetConstructor: Type<any>,
            targetSchema: string,
            always: boolean,
            strictGroups: boolean,
            groups?: string[],
          ) => Array<{
            propertyName: string;
            name: string;
            constraints?: any[];
          }>;
        };
      };
      const storage = getMetadataStorage();
      // class-validator v0.14+ 호환성: groups 파라미터 추가
      const metadatas = storage.getTargetValidationMetadatas(
        dtoClass,
        '',
        false,
        false,
        undefined,
      );

      for (const metadata of metadatas) {
        const propertyName = metadata.propertyName;
        if (!rules[propertyName]) {
          rules[propertyName] = {};
        }

        // 검증 규칙 매핑
        switch (metadata.name) {
          case 'isNotEmpty':
          case 'isDefined':
            rules[propertyName].required = true;
            break;
          case 'isString':
            rules[propertyName].type = 'string';
            break;
          case 'isNumber':
          case 'isInt':
            rules[propertyName].type = 'number';
            break;
          case 'maxLength':
            rules[propertyName].maxLength = metadata.constraints?.[0];
            break;
          case 'minLength':
            rules[propertyName].minLength = metadata.constraints?.[0];
            break;
          case 'max':
            rules[propertyName].max = metadata.constraints?.[0];
            break;
          case 'min':
            rules[propertyName].min = metadata.constraints?.[0];
            break;
          case 'matches':
            rules[propertyName].pattern = metadata.constraints?.[0]?.toString();
            break;
        }
      }
    } catch {
      // class-validator 미설치 또는 메타데이터 추출 실패 시 빈 객체 반환
      // detailLevel: 'full' 사용 시 class-validator 설치 권장 (선택적 의존성)
      // 로깅은 호출측에서 필요 시 처리
    }

    return rules;
  }

  /**
   * 기본 복수형 변환 로직
   *
   * 프로덕션 환경에서는 'pluralize' 또는 'inflection' 패키지 사용 강력 권장
   * npm install pluralize / npm install inflection
   *
   * 이 간단한 구현은 모든 케이스를 커버하지 않으므로,
   * 사용자가 JsonApiControllerOptions.type을 명시적으로 지정하는 것을 권장합니다.
   */
  private pluralize(word: string): string {
    // 불규칙 복수형 처리 (확장)
    const irregulars: Record<string, string> = {
      // 기존 불규칙 복수형
      person: 'people',
      child: 'children',
      man: 'men',
      woman: 'women',
      foot: 'feet',
      tooth: 'teeth',
      goose: 'geese',
      mouse: 'mice',
      datum: 'data',
      medium: 'media',
      criterion: 'criteria',
      phenomenon: 'phenomena',
      index: 'indices',
      matrix: 'matrices',
      vertex: 'vertices',
      axis: 'axes',
      crisis: 'crises',
      analysis: 'analyses',
      // 추가: 동일 형태 복수형 (단수 = 복수)
      sheep: 'sheep',
      fish: 'fish',
      deer: 'deer',
      species: 'species',
      series: 'series',
      aircraft: 'aircraft',
      // 추가: 라틴어/그리스어 유래
      alumni: 'alumni',
      stimulus: 'stimuli',
      focus: 'foci',
      fungus: 'fungi',
      cactus: 'cacti',
      thesis: 'theses',
      hypothesis: 'hypotheses',
      appendix: 'appendices',
      // 추가: 일반적인 불규칙
      ox: 'oxen',
      louse: 'lice',
      quiz: 'quizzes',
    };

    const lowerWord = word.toLowerCase();
    if (irregulars[lowerWord]) {
      return irregulars[lowerWord];
    }

    // 규칙적 복수형 변환
    // 1. -y로 끝나는 경우 (자음 + y -> ies)
    if (
      word.endsWith('y') &&
      !['a', 'e', 'i', 'o', 'u'].includes(word.charAt(word.length - 2))
    ) {
      return word.slice(0, -1) + 'ies';
    }
    // 2. -s, -x, -z, -ch, -sh로 끝나는 경우 -> es
    if (
      word.endsWith('s') ||
      word.endsWith('x') ||
      word.endsWith('z') ||
      word.endsWith('ch') ||
      word.endsWith('sh')
    ) {
      return word + 'es';
    }
    // 3. -o로 끝나는 경우 (일부 -> es)
    const oEsWords = ['hero', 'potato', 'tomato', 'echo', 'veto'];
    if (word.endsWith('o') && oEsWords.includes(lowerWord)) {
      return word + 'es';
    }
    // 4. -f로 끝나는 경우 -> ves
    if (word.endsWith('f')) {
      return word.slice(0, -1) + 'ves';
    }
    // 5. -fe로 끝나는 경우 -> ves
    if (word.endsWith('fe')) {
      return word.slice(0, -2) + 'ves';
    }
    // 6. 기본: s 추가
    return word + 's';
  }
}
