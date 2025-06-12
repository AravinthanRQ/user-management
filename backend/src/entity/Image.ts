import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from "typeorm";
import { User } from "./User";

@Entity()
export class Image {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  originalName!: string;

  @Column()
  s3Key!: string;

  @Column()
  s3PreviewUrl!: string;

  @Column()
  s3DownloadUrl!: string;

  @ManyToOne(() => User, user => user.images, { onDelete: "CASCADE" })
  user!: User;
}
