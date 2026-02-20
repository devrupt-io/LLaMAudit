import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface SettingsAttributes {
  id: string;
  key: string;
  value: string;
}

interface SettingsCreationAttributes extends Optional<SettingsAttributes, 'id'> {}

class Settings extends Model<SettingsAttributes, SettingsCreationAttributes> implements SettingsAttributes {
  public id!: string;
  public key!: string;
  public value!: string;
}

Settings.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
  },
  {
    sequelize,
    tableName: 'settings',
    timestamps: true,
  }
);

export default Settings;
