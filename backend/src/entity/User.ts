import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from "typeorm";
import { Exclude } from "class-transformer";
import { Image } from "./Image";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  email!: string;

  @Exclude()
  @Column()
  password!: string;

  @OneToMany(() => Image, image => image.user)
  images!: Image[];
}
