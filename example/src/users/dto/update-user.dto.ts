import { IsString, IsOptional, IsEmail, IsIn } from "class-validator";

/**
 * UpdateUserDto
 *
 * 사용자 수정 요청 데이터 검증 DTO
 */
export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: "유효한 이메일 주소를 입력해주세요" })
  email?: string;

  @IsOptional()
  @IsString({ message: "이름은 문자열이어야 합니다" })
  name?: string;

  @IsOptional()
  @IsIn(["admin", "user"], { message: "역할은 admin 또는 user여야 합니다" })
  role?: string;
}
