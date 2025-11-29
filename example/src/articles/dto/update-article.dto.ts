import { IsString, IsOptional, IsIn, IsDateString } from "class-validator";

/**
 * UpdateArticleDto
 *
 * DTO for validating article update request data
 */
export class UpdateArticleDto {
  @IsOptional()
  @IsString({ message: "Title must be a string" })
  title?: string;

  @IsOptional()
  @IsString({ message: "Content must be a string" })
  content?: string;

  @IsOptional()
  @IsIn(["draft", "published", "archived"], {
    message: "Status must be one of: draft, published, archived",
  })
  status?: string;

  @IsOptional()
  @IsDateString({}, { message: "Published date must be a valid date format" })
  publishedAt?: string;
}
