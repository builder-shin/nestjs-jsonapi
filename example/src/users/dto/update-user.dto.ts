import { IsString, IsOptional, IsEmail, IsIn } from "class-validator";

/**
 * UpdateUserDto
 *
 * DTO for validating user update request data
 */
export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: "Please enter a valid email address" })
  email?: string;

  @IsOptional()
  @IsString({ message: "Name must be a string" })
  name?: string;

  @IsOptional()
  @IsIn(["admin", "user"], { message: "Role must be either admin or user" })
  role?: string;
}
