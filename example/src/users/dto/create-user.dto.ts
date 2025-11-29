import { IsString, IsNotEmpty, IsEmail, IsOptional, IsIn } from "class-validator";

/**
 * CreateUserDto
 *
 * DTO for validating user creation request data
 */
export class CreateUserDto {
  @IsEmail({}, { message: "Please enter a valid email address" })
  @IsNotEmpty({ message: "Email is required" })
  email: string;

  @IsString({ message: "Name must be a string" })
  @IsNotEmpty({ message: "Name is required" })
  name: string;

  @IsOptional()
  @IsIn(["admin", "user"], { message: "Role must be either admin or user" })
  role?: string;
}
