import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1749691502135 implements MigrationInterface {
    name = 'Init1749691502135'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "image" ("id" SERIAL NOT NULL, "originalName" character varying NOT NULL, "s3Key" character varying NOT NULL, "s3PreviewUrl" character varying NOT NULL, "s3DownloadUrl" character varying NOT NULL, "userId" integer, CONSTRAINT "PK_d6db1ab4ee9ad9dbe86c64e4cc3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "image" ADD CONSTRAINT "FK_dc40417dfa0c7fbd70b8eb880cc" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "image" DROP CONSTRAINT "FK_dc40417dfa0c7fbd70b8eb880cc"`);
        await queryRunner.query(`DROP TABLE "image"`);
    }

}
