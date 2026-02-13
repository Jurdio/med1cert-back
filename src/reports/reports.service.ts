import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from './entities/report.entity';
import { TenantContext } from '../common/tenant/tenant.context';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,
    private readonly tenantContext: TenantContext,
  ) {}

  async findAll(reportType?: string) {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) return [];

    const qb = this.reportRepo
      .createQueryBuilder('r')
      .where('r.tenantId = :tenantId', { tenantId })
      .orderBy('r.createdAt', 'DESC');

    if (reportType) {
      qb.andWhere('r.reportType = :reportType', { reportType });
    }

    return qb.getMany();
  }
}
