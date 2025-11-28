import { IsString, IsNotEmpty, IsOptional, IsIn, IsUUID } from "class-validator";

/**
 * CreateArticleDto
 *
 * 게시글 생성 요청 데이터 검증 DTO
 */
export class CreateArticleDto {
  @IsString({ message: "제목은 문자열이어야 합니다" })
  @IsNotEmpty({ message: "제목은 필수입니다" })
  title: string;

  @IsString({ message: "내용은 문자열이어야 합니다" })
  @IsNotEmpty({ message: "내용은 필수입니다" })
  content: string;

  @IsOptional()
  @IsIn(["draft", "published", "archived"], {
    message: "상태는 draft, published, archived 중 하나여야 합니다",
  })
  status?: string;

  @IsUUID("4", { message: "작성자 ID는 유효한 UUID여야 합니다" })
  @IsNotEmpty({ message: "작성자 ID는 필수입니다" })
  authorId: string;
}
