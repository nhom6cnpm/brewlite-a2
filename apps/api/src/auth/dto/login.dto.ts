import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'customer@brewlite.com',
    description: 'Địa chỉ email người dùng',
  })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @ApiProperty({
    example: '123456',
    description: 'Mật khẩu đăng nhập',
  })
  @IsString({ message: 'Mật khẩu phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MaxLength(72, { message: 'Mật khẩu tối đa 72 ký tự' })
  password!: string;
}

