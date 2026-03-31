import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  login(dto: LoginDto): { accessToken: string } {
    // No user lookup — payload is the user identity itself (simplified auth)
    const payload = { username: dto.username, email: dto.email };
    return { accessToken: this.jwtService.sign(payload) };
  }
}
