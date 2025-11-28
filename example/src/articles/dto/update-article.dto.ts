import { IsString, IsOptional, IsIn, IsDateString } from "class-validator";

/**
 * UpdateArticleDto
 *
 * 게시글 수정 요청 데이터 검증 DTO
 */
export class UpdateArticleDto {
  @IsOptional()
  @IsString({ message: "제목은 문자열이어야 합니다" })
  title?: string;

  @IsOptional()
  @IsString({ message: "내용은 문자열이어야 합니다" })
  content?: string;

  @IsOptional()
  @IsIn(["draft", "published", "archived"], {
    message: "상태는 draft, published, archived 중 하나여야 합니다",
  })
  status?: string;

  @IsOptional()
  @IsDateString({}, { message: "발행일은 유효한 날짜 형식이어야 합니다" })
  publishedAt?: string;
}
