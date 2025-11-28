import { IsString, IsNotEmpty, IsEmail, IsOptional, IsIn } from "class-validator";

/**
 * CreateUserDto
 *
 * 사용자 생성 요청 데이터 검증 DTO
 */
export class CreateUserDto {
  @IsEmail({}, { message: "유효한 이메일 주소를 입력해주세요" })
  @IsNotEmpty({ message: "이메일은 필수입니다" })
  email: string;

  @IsString({ message: "이름은 문자열이어야 합니다" })
  @IsNotEmpty({ message: "이름은 필수입니다" })
  name: string;

  @IsOptional()
  @IsIn(["admin", "user"], { message: "역할은 admin 또는 user여야 합니다" })
  role?: string;
}
