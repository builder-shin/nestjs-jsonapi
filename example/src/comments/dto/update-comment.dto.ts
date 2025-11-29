import { IsString, IsOptional } from "class-validator";

/**
 * UpdateCommentDto
 *
 * DTO for validating comment update request data
 */
export class UpdateCommentDto {
  @IsOptional()
  @IsString({ message: "Comment body must be a string" })
  body?: string;
}
