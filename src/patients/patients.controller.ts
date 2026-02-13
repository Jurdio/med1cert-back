import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { QueryPatientsDto } from './dto/query-patients.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/permissions.decorator';
import { TenantGuard } from '../common/tenant/tenant.guard';

@ApiTags('patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a patient' })
  @ApiResponse({ status: 201, description: 'Patient created' })
  @RequirePermission('Documents', 'patients', 'save')
  create(@Body() dto: CreatePatientDto) {
    return this.patientsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List patients with pagination and search' })
  @RequirePermission('Documents', 'patients', 'read')
  findAll(@Query() query: QueryPatientsDto) {
    return this.patientsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get patient by id' })
  @ApiParam({ name: 'id', type: String })
  @RequirePermission('Documents', 'patients', 'read')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.patientsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update patient by id' })
  @ApiParam({ name: 'id', type: String })
  @RequirePermission('Documents', 'patients', 'save')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdatePatientDto) {
    return this.patientsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete patient by id' })
  @ApiParam({ name: 'id', type: String })
  @RequirePermission('Documents', 'patients', 'save')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.patientsService.remove(id);
  }
}
