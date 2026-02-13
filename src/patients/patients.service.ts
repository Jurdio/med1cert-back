import { Injectable, NotFoundException } from '@nestjs/common';
import { ILike } from 'typeorm';
import { Patient } from './entities/patient.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { QueryPatientsDto } from './dto/query-patients.dto';
import { TenantRepositoryFactory } from '../common/tenant/tenant-repository.factory';

@Injectable()
export class PatientsService {
  private patientRepository: ReturnType<TenantRepositoryFactory['getRepository']>;

  constructor(private readonly tenantRepoFactory: TenantRepositoryFactory) {
    this.patientRepository = this.tenantRepoFactory.getRepository(Patient);
  }

  async create(dto: CreatePatientDto) {
    const patient = this.patientRepository.create(dto as any);
    return this.patientRepository.save(patient);
  }

  async findAll(query: QueryPatientsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any[] = [];
    if (query.search) {
      const ilike = ILike(`%${query.search}%`);
      where.push({ fullName: ilike });
      where.push({ email: ilike });
    }

    const [items, total] = await this.patientRepository.findAndCount({
      where: where.length > 0 ? where : undefined,
      order: { createdAt: 'DESC' } as any,
      skip,
      take: limit,
    });

    const totalPages = Math.max(1, Math.ceil(total / limit));
    return { items, total, page, limit, totalPages };
  }

  async findOne(id: string) {
    const patient = await this.patientRepository.findOne({ where: { id } as any });
    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }

  async update(id: string, dto: UpdatePatientDto) {
    const patient = await this.findOne(id);
    Object.assign(patient, dto);
    return this.patientRepository.save(patient);
  }

  async remove(id: string) {
    const patient = await this.findOne(id);
    await this.patientRepository.remove(patient);
    return { deleted: true };
  }
}
