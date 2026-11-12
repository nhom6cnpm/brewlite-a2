import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'customer@brewlite.com',
    description: 'Địa chỉ email người dùng',
  })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @ApiProperty({
    example: '123456',
    description: 'Mật khẩu độ dài từ 6 đến 72 ký tự',
    minLength: 6,
    maxLength: 72,
  })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải dài ít nhất 6 ký tự' })
  // bcrypt only uses the first 72 bytes
  @MaxLength(72, { message: 'Mật khẩu tối đa 72 ký tự' })
  password!: string;
}

