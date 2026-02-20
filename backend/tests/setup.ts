import { sequelize, initDatabase } from '../src/config/database';

beforeAll(async () => {
  await initDatabase();
});

afterAll(async () => {
  await sequelize.close();
});
