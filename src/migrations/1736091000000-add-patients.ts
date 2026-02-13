import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class AddPatients1736091000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'patients',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isNullable: false, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'tenantId', type: 'uuid', isNullable: false },
          { name: 'fullName', type: 'varchar', length: '200', isNullable: false },
          { name: 'email', type: 'varchar', length: '320', isNullable: false },
          { name: 'walletAddress', type: 'varchar', length: '100', isNullable: true },
          { name: 'phone', type: 'varchar', length: '20', isNullable: true },
          { name: 'dateOfBirth', type: 'date', isNullable: true },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp with time zone', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp with time zone', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('patients', new TableIndex({ name: 'IDX_patients_tenantId', columnNames: ['tenantId'] }));
    await queryRunner.createIndex(
      'patients',
      new TableIndex({ name: 'UQ_patients_tenant_email', columnNames: ['tenantId', 'email'], isUnique: true }),
    );
    await queryRunner.createIndex(
      'patients',
      new TableIndex({ name: 'UQ_patients_tenant_wallet', columnNames: ['tenantId', 'walletAddress'], isUnique: true }),
    );
    await queryRunner.createForeignKey(
      'patients',
      new TableForeignKey({
        name: 'FK_patients_tenant',
        columnNames: ['tenantId'],
        referencedTableName: 'tenants',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('patients', 'FK_patients_tenant');
    await queryRunner.dropIndex('patients', 'UQ_patients_tenant_wallet');
    await queryRunner.dropIndex('patients', 'UQ_patients_tenant_email');
    await queryRunner.dropIndex('patients', 'IDX_patients_tenantId');
    await queryRunner.dropTable('patients');
  }
}
