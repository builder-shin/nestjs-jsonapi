import { IsString, IsNotEmpty, IsOptional, IsIn, IsUUID } from "class-validator";

/**
 * CreateArticleDto
 *
 * DTO for validating article creation request data
 */
export class CreateArticleDto {
  @IsString({ message: "Title must be a string" })
  @IsNotEmpty({ message: "Title is required" })
  title: string;

  @IsString({ message: "Content must be a string" })
  @IsNotEmpty({ message: "Content is required" })
  content: string;

  @IsOptional()
  @IsIn(["draft", "published", "archived"], {
    message: "Status must be one of: draft, published, archived",
  })
  status?: string;

  @IsUUID("4", { message: "Author ID must be a valid UUID" })
  @IsNotEmpty({ message: "Author ID is required" })
  authorId: string;
}
