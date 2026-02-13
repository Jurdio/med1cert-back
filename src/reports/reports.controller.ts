import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/tenant/tenant.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermission } from '../auth/permissions.decorator';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@RequirePermission('Documents', 'history', 'read')
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiOperation({ summary: 'List reports for current tenant' })
  @ApiQuery({ name: 'reportType', required: false, description: 'Filter by type (monthly, activity, directions, patients, overview)' })
  @ApiOkResponse({ description: 'List of reports' })
  findAll(@Query('reportType') reportType?: string) {
    return this.reportsService.findAll(reportType);
  }
}
