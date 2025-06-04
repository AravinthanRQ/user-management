import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { User } from "./entity/User";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: true,
  entities: [User],
  subscribers: [],
  migrations: []
});

export const userRepository = AppDataSource.getRepository(User)