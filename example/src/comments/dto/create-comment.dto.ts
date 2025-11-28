import { IsString, IsNotEmpty, IsUUID } from "class-validator";

/**
 * CreateCommentDto
 *
 * 댓글 생성 요청 데이터 검증 DTO
 */
export class CreateCommentDto {
  @IsString({ message: "댓글 내용은 문자열이어야 합니다" })
  @IsNotEmpty({ message: "댓글 내용은 필수입니다" })
  body: string;

  @IsUUID("4", { message: "작성자 ID는 유효한 UUID여야 합니다" })
  @IsNotEmpty({ message: "작성자 ID는 필수입니다" })
  authorId: string;

  @IsUUID("4", { message: "게시글 ID는 유효한 UUID여야 합니다" })
  @IsNotEmpty({ message: "게시글 ID는 필수입니다" })
  articleId: string;
}
