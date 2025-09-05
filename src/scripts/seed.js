
const { sequelize } = require('../models');
const { seedFromExcel } = require('../utils/databaseSeeder');

/**
 * Script runner para popular o banco de dados manualmente via `npm run seed`.
 */
const run = async () => {
  const transaction = await sequelize.transaction();
  try {
    await seedFromExcel({ transaction });
    await transaction.commit();
    console.log('\n✅ Seeding manual concluído com sucesso!');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Ocorreu um erro durante o seeding manual:', error);
  } finally {
    await sequelize.close();
    console.log('Conexão com o banco de dados fechada.');
  }
};

run();