const { DataTypes, Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const sequelize = new Sequelize('hall_booking_system', 'root', 'gobiUK@008', {
  host: 'localhost',
  port: 3306,
  dialect: 'mysql',
  logging: false
});

class Schema {
  constructor(definition, options = {}) {
    this.definition = definition;
    this.options = { timestamps: true, ...options };
    this.methods = {};
    this.hooks = {};
  }
}

class MongooseQuery {
  constructor(model, type, args) {
    this.model = model;
    this.type = type;
    this.args = args;
    this.isLean = false;
  }

  lean() {
    this.isLean = true;
    return this;
  }

  async exec() {
    console.log('EXEC CALLED!');
    const seqModel = sequelize.models[this.model.name];
    const results = await seqModel.findAll({});
    return results.map(r => r.get({ plain: true }));
  }

  then(onFulfilled, onRejected) {
    console.log('THEN CALLED!');
    return this.exec().then(onFulfilled, onRejected);
  }
}

class ModelWrapper {
  constructor(name, schema) {
    this.name = name;
    this.schema = schema;

    const columns = {
      id: {
        type: DataTypes.STRING(191),
        primaryKey: true,
        allowNull: false,
        defaultValue: () => uuidv4()
      },
      name: DataTypes.STRING
    };

    sequelize.define(name, columns, {
      timestamps: schema.options.timestamps,
      freezeTableName: true,
      tableName: name.toLowerCase()
    });
  }

  find(query = {}) {
    return new MongooseQuery(this, 'find', [query]);
  }
}

async function run() {
  try {
    await sequelize.authenticate();
    const User = new ModelWrapper('User', new Schema({ name: String }));
    
    console.log('Awaiting find query...');
    const result = await User.find({});
    console.log('Awaited result:', result);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
