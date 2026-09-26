import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  modelId!: string;
}

export class JoinSessionDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
}
