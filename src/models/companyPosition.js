'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
class UserCompany extends Model {
static associate(models) {
// Associações podem ser definidas aqui se necessário
}
}
UserCompany.init({
userId: {
type: DataTypes.UUID,
references: { model: 'users', key: 'id' }, // CORRIGIDO: 'Users' para 'users'
primaryKey: true,
},
companyId: {
type: DataTypes.UUID,
references: { model: 'companies', key: 'id' }, // CORRIGIDO: 'Companies' para 'companies'
primaryKey: true,
},
}, {
sequelize,
modelName: 'UserCompany',
});
return UserCompany;
};