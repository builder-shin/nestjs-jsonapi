import { IsString, IsNotEmpty, IsUUID } from "class-validator";

/**
 * CreateCommentDto
 *
 * DTO for validating comment creation request data
 */
export class CreateCommentDto {
  @IsString({ message: "Comment body must be a string" })
  @IsNotEmpty({ message: "Comment body is required" })
  body: string;

  @IsUUID("4", { message: "Author ID must be a valid UUID" })
  @IsNotEmpty({ message: "Author ID is required" })
  authorId: string;

  @IsUUID("4", { message: "Article ID must be a valid UUID" })
  @IsNotEmpty({ message: "Article ID is required" })
  articleId: string;
}
