import { Body, Controller, ForbiddenException, Get, Param, Patch } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { RequirePermissions } from '../../common/decorators/auth.decorators'

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id)
  }

  @Patch(':id/roles')
  @RequirePermissions('roles.gestionar')
  @ApiOperation({ summary: 'Asignar rol RBAC a un usuario (solo administradores)' })
  assignRole(
    @Param('id') id: string,
    @Body() body: { roleName: string; projectId?: string | null },
  ) {
    if (!body?.roleName?.trim()) {
      throw new ForbiddenException('roleName es obligatorio')
    }
    return this.usersService.assignRole(id, body.roleName.trim(), body.projectId ?? null)
  }
}
