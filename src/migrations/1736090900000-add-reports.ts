import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddReports1736090900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'reports',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isNullable: false, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'tenantId', type: 'uuid', isNullable: false },
          { name: 'title', type: 'varchar', length: '300', isNullable: false },
          { name: 'reportType', type: 'varchar', length: '120', isNullable: false },
          { name: 'body', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp with time zone', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp with time zone', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('reports', new TableIndex({ name: 'IDX_reports_tenantId', columnNames: ['tenantId'] }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('reports', 'IDX_reports_tenantId');
    await queryRunner.dropTable('reports');
  }
}
