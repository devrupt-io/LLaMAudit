import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface AnalysisAttributes {
  id: string;
  title: string;
  inputText: string;
  status: string;
  overallScore: number;
  sections: object[];
  models: string[];
  provider: string;
  summary: string;
  error: string;
  perModelResults: object[];
  progress: object;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AnalysisCreationAttributes extends Optional<AnalysisAttributes, 'id' | 'overallScore' | 'sections' | 'summary' | 'error' | 'perModelResults' | 'progress'> {}

class Analysis extends Model<AnalysisAttributes, AnalysisCreationAttributes> implements AnalysisAttributes {
  public id!: string;
  public title!: string;
  public inputText!: string;
  public status!: string;
  public overallScore!: number;
  public sections!: object[];
  public models!: string[];
  public provider!: string;
  public summary!: string;
  public error!: string;
  public perModelResults!: object[];
  public progress!: object;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Analysis.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false,
      defaultValue: 'Untitled Analysis',
    },
    inputText: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
    },
    overallScore: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    sections: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    models: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    provider: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'openrouter',
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    },
    perModelResults: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    progress: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    sequelize,
    tableName: 'analyses',
    timestamps: true,
  }
);

export default Analysis;
