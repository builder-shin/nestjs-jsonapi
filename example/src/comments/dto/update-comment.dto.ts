import { IsString, IsOptional } from "class-validator";

/**
 * UpdateCommentDto
 *
 * 댓글 수정 요청 데이터 검증 DTO
 */
export class UpdateCommentDto {
  @IsOptional()
  @IsString({ message: "댓글 내용은 문자열이어야 합니다" })
  body?: string;
}
