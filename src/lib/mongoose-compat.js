import { DataTypes, Op } from 'sequelize';
import { getSequelize } from './sequelize';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// Cached models registry
const modelsRegistry = {};

// Generate UUID for ID compatibility
function generateHexId() {
  return uuidv4();
}

export const Types = {
  ObjectId: {
    isValid(id) {
      return typeof id === 'string' && (
        /^[0-9a-fA-F]{24}$/.test(id) ||
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)
      );
    },
    toString() {
      return generateHexId();
    }
  }
};

// Schema Definition Simulator
export class Schema {
  constructor(definition, options = {}) {
    this.definition = definition;
    this.options = { timestamps: true, ...options };
    this.methods = {};
    this.hooks = {};
    this.indexes = [];
  }

  pre(hookName, fn) {
    if (!this.hooks[hookName]) {
      this.hooks[hookName] = [];
    }
    this.hooks[hookName].push(fn);
  }

  index(indexFields, options = {}) {
    this.indexes.push({ fields: Object.keys(indexFields), ...options });
  }
}

Schema.Types = {
  ObjectId: 'ObjectId'
};

// Convert Mongoose Types to Sequelize DataTypes
function translateMongooseType(val, key) {
  if (val === String) {
    if (key === 'email' || key === 'name' || key === 'registrationNumber' || key === 'roomNumber') {
      return { type: DataTypes.STRING(255) };
    }
    return { type: DataTypes.TEXT };
  }
  if (val === Number) return { type: DataTypes.DOUBLE };
  if (val === Boolean) return { type: DataTypes.BOOLEAN };
  if (val === Date) return { type: DataTypes.DATE };
  if (val === Array) return { type: DataTypes.JSON };

  if (Array.isArray(val)) {
    return { type: DataTypes.JSON, defaultValue: [] };
  }

  if (typeof val === 'object' && val !== null) {
    if (val.type) {
      const parsed = translateMongooseType(val.type, key);
      if (val.default !== undefined) {
        parsed.defaultValue = typeof val.default === 'function' ? val.default : val.default;
      }
      if (val.required) {
        parsed.allowNull = false;
      }
      if (val.unique) {
        parsed.unique = true;
        parsed.type = DataTypes.STRING(255); // Ensure unique fields are STRING for index
      }
      return parsed;
    }
    return { type: DataTypes.JSON, defaultValue: {} };
  }

  return { type: DataTypes.TEXT };
}

// Build Sequelize columns from Mongoose Schema definition
function buildSequelizeColumns(schema) {
  const columns = {
    id: {
      type: DataTypes.STRING(191),
      primaryKey: true,
      allowNull: false,
      defaultValue: generateHexId
    }
  };

  for (const [key, val] of Object.entries(schema.definition)) {
    if (key === '_id' || key === 'id') continue;
    // Map mongoose ObjectId references to VARCHAR(191) strings
    if (val === 'ObjectId' || val.type === 'ObjectId' || (typeof val.type === 'object' && val.type?.name === 'ObjectId') || val.type === Schema.Types?.ObjectId) {
      columns[key] = {
        type: DataTypes.STRING(191),
        allowNull: !val.required
      };
      continue;
    }
    // Handle specific array objects or nested schemas
    columns[key] = translateMongooseType(val, key);
  }

  return columns;
}

// Translate Mongoose query syntax to Sequelize query options
function translateQuery(query) {
  if (!query) return {};
  const where = {};

  for (const [key, value] of Object.entries(query)) {
    // Skip undefined filters
    if (value === undefined) continue;

    if (key === '$or') {
      where[Op.or] = value.map(translateQuery);
    } else if (key === '$and') {
      where[Op.and] = value.map(translateQuery);
    } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      const fieldCond = {};
      for (const [op, opVal] of Object.entries(value)) {
        if (op === '$regex') {
          fieldCond[Op.like] = `%${opVal}%`;
        } else if (op === '$options' && opVal === 'i') {
          // MySQL LIKE queries are case-insensitive by default under standard collations
        } else if (op === '$ne') {
          fieldCond[Op.ne] = opVal;
        } else if (op === '$gte') {
          fieldCond[Op.gte] = opVal;
        } else if (op === '$lte') {
          fieldCond[Op.lte] = opVal;
        } else if (op === '$gt') {
          fieldCond[Op.gt] = opVal;
        } else if (op === '$lt') {
          fieldCond[Op.lt] = opVal;
        } else if (op === '$in') {
          fieldCond[Op.in] = opVal;
        } else if (op === '$nin') {
          fieldCond[Op.notIn] = opVal;
        }
      }
      where[key] = fieldCond;
    } else {
      where[key] = value;
    }
  }

  // Map mongoose id/._id to Sequelize id
  if (where._id) {
    where.id = where._id;
    delete where._id;
  }

  return where;
}

// Post-query populations mapping (mimics mongoose populate)
async function populateResults(results, populateOpts) {
  if (!results) return results;
  const isArray = Array.isArray(results);
  const docs = isArray ? results : [results];

  for (const opt of populateOpts) {
    const path = typeof opt === 'string' ? opt : opt.path;
    const select = typeof opt === 'object' ? opt.select : null;

    for (const doc of docs) {
      if (path.includes('.')) {
        const parts = path.split('.');
        const parentKey = parts[0];
        const childKey = parts[1];
        
        const parentVal = doc[parentKey];
        if (Array.isArray(parentVal)) {
          for (const item of parentVal) {
            const refId = item[childKey];
            if (refId && typeof refId === 'string') {
              let refModelName = null;
              if (childKey === 'approvedBy') {
                refModelName = 'User';
              }
              if (refModelName) {
                const RefModel = modelsRegistry[refModelName];
                if (RefModel) {
                  const refDoc = await RefModel.findById(refId);
                  if (refDoc) {
                    const plainDoc = refDoc.toObject ? refDoc.toObject() : refDoc;
                    if (select) {
                      const fields = select.split(' ').filter(f => f);
                      const filtered = {};
                      const excludes = fields.filter(f => f.startsWith('-')).map(f => f.slice(1));
                      const includes = fields.filter(f => !f.startsWith('-'));
                      if (excludes.length > 0) {
                        for (const [k, v] of Object.entries(plainDoc)) {
                          if (!excludes.includes(k)) filtered[k] = v;
                        }
                      } else {
                        for (const f of includes) {
                          filtered[f] = plainDoc[f];
                        }
                      }
                      filtered.id = plainDoc.id;
                      filtered._id = plainDoc._id;
                      item[childKey] = filtered;
                    } else {
                      item[childKey] = plainDoc;
                    }
                  }
                }
              }
            }
          }
        }
      } else {
        const refId = doc[path];
        if (refId && typeof refId === 'string') {
          let refModelName = null;
          if (path === 'user' || path === 'actionBy') {
            refModelName = 'User';
          } else if (path === 'serviceId') {
            if (doc.serviceType === 'hall') refModelName = 'Hall';
            else if (doc.serviceType === 'vehicle') refModelName = 'Vehicle';
            else if (doc.serviceType === 'room') refModelName = 'GuestRoom';
          } else {
            if (path === 'hall') refModelName = 'Hall';
            if (path === 'vehicle') refModelName = 'Vehicle';
            if (path === 'room') refModelName = 'GuestRoom';
          }

          if (refModelName) {
            const RefModel = modelsRegistry[refModelName];
            if (RefModel) {
              const refDoc = await RefModel.findById(refId);
              if (refDoc) {
                const plainDoc = refDoc.toObject ? refDoc.toObject() : refDoc;
                if (select) {
                  const fields = select.split(' ').filter(f => f);
                  const filtered = {};
                  const excludes = fields.filter(f => f.startsWith('-')).map(f => f.slice(1));
                  const includes = fields.filter(f => !f.startsWith('-'));

                  if (excludes.length > 0) {
                    for (const [k, v] of Object.entries(plainDoc)) {
                      if (!excludes.includes(k)) filtered[k] = v;
                    }
                  } else {
                    for (const f of includes) {
                      filtered[f] = plainDoc[f];
                    }
                  }
                  filtered.id = plainDoc.id;
                  filtered._id = plainDoc._id;
                  doc[path] = filtered;
                } else {
                  doc[path] = plainDoc;
                }
              }
            }
          }
        }
      }
    }
  }

  return results;
}

// Query Class wrapper that simulates Mongoose chainable query
class MongooseQuery {
  constructor(model, type, args) {
    this.model = model;
    this.type = type; // 'find', 'findOne', 'findById', 'countDocuments'
    this.args = args;
    this.sortOpt = null;
    this.populateOpts = [];
    this.selectOpt = null;
    this.isLean = false;
  }

  sort(sortVal) {
    this.sortOpt = sortVal;
    return this;
  }

  select(selectVal) {
    this.selectOpt = selectVal;
    return this;
  }

  populate(populateVal) {
    if (Array.isArray(populateVal)) {
      this.populateOpts.push(...populateVal);
    } else {
      this.populateOpts.push(populateVal);
    }
    return this;
  }

  lean() {
    this.isLean = true;
    return this;
  }

  async exec() {
    const sequelize = getSequelize();
    const seqModel = sequelize.models[this.model.name];

    const options = {};
    const where = translateQuery(this.args[0]);
    if (Object.keys(where).length > 0) {
      options.where = where;
    }

    if (this.sortOpt) {
      // Map sort: { name: 1 } or '-createdAt' or 'name'
      let order = [];
      if (typeof this.sortOpt === 'string') {
        const fields = this.sortOpt.split(' ');
        for (const field of fields) {
          if (field.startsWith('-')) {
            order.push([field.slice(1), 'DESC']);
          } else {
            order.push([field, 'ASC']);
          }
        }
      } else if (typeof this.sortOpt === 'object' && this.sortOpt !== null) {
        for (const [k, v] of Object.entries(this.sortOpt)) {
          order.push([k, v === -1 ? 'DESC' : 'ASC']);
        }
      }
      if (order.length > 0) options.order = order;
    }

    if (this.selectOpt) {
      // E.g. '+specialRequests' or 'name email'
      // By default we select all fields. If we want to hide or show, we can map to attributes
    }

    if (this.type === 'countDocuments') {
      return await seqModel.count(options);
    }

    if (this.type === 'findOne' || this.type === 'findById') {
      const res = await seqModel.findOne(options);
      if (!res) return null;
      const plain = res.get({ plain: true });
      const instanceId = plain.id || plain._id || res.id || res._id;
      const wrapped = this.isLean ? { ...plain, id: instanceId, _id: instanceId } : this.model.wrapInstance(res);
      if (this.populateOpts.length > 0) {
        await populateResults(wrapped, this.populateOpts);
      }
      return wrapped;
    }

    // find query
    const results = await seqModel.findAll(options);
    const wrappedResults = results.map(r => {
      const plain = r.get({ plain: true });
      const instanceId = plain.id || plain._id || r.id || r._id;
      return this.isLean ? { ...plain, id: instanceId, _id: instanceId } : this.model.wrapInstance(r);
    });
    if (this.populateOpts.length > 0) {
      await populateResults(wrappedResults, this.populateOpts);
    }
    return wrappedResults;
  }

  // Thenable implementation to support direct await
  then(onFulfilled, onRejected) {
    return this.exec().then(onFulfilled, onRejected);
  }
}

function applySchemaDefaults(schema, data) {
  const result = { ...data };
  for (const [key, val] of Object.entries(schema.definition)) {
    if (val && typeof val === 'object' && !val.type && !Array.isArray(val)) {
      // It's a nested schema definition (like permissions)
      const subObj = result[key] || {};
      for (const [subKey, subVal] of Object.entries(val)) {
        if (subVal && typeof subVal === 'object' && subVal.default !== undefined) {
          if (subObj[subKey] === undefined) {
            subObj[subKey] = typeof subVal.default === 'function' ? subVal.default() : subVal.default;
          }
        }
      }
      result[key] = subObj;
    } else if (val && typeof val === 'object' && val.default !== undefined) {
      if (result[key] === undefined) {
        result[key] = typeof val.default === 'function' ? val.default() : val.default;
      }
    }
  }
  return result;
}

// Wrapper for Model Class
class ModelWrapper {
  constructor(name, schema) {
    this.name = name;
    this.schema = schema;

    const sequelize = getSequelize();
    const columns = buildSequelizeColumns(schema);

    // Register Sequelize model
    const seqModel = sequelize.define(name, columns, {
      timestamps: schema.options.timestamps,
      freezeTableName: true,
      tableName: name.toLowerCase(),
      hooks: {
        beforeSave: async (instance) => {
          // Inject isModified utility for Mongoose hooks
          instance.isModified = function (field) {
            return instance.changed(field) !== false;
          };
          if (schema.hooks.save) {
            for (const hook of schema.hooks.save) {
              await hook.call(instance);
            }
          }
        }
      }
    });

    // Attach custom methods to prototype
    if (schema.methods) {
      for (const [methodName, fn] of Object.entries(schema.methods)) {
        seqModel.prototype[methodName] = fn;
      }
    }
  }

  wrapInstance(seqInstance) {
    if (!seqInstance) return null;
    const plain = seqInstance.get({ plain: true });
    const instanceId = plain.id || plain._id || seqInstance.id || seqInstance._id;

    // Expose virtual 'id' and '_id' mapping
    const obj = {
      ...plain,
      id: instanceId,
      _id: instanceId,
      toObject() {
        const clean = {};
        for (const [k, v] of Object.entries(this)) {
          if (typeof v !== 'function') clean[k] = v;
        }
        return clean;
      },
      toJSON() {
        const clean = {};
        for (const [k, v] of Object.entries(this)) {
          if (typeof v !== 'function') clean[k] = v;
        }
        return clean;
      },
      isModified(field) {
        return seqInstance.changed(field) !== false;
      },
      populate: async function (path, select) {
        await populateResults(this, [{ path, select }]);
        return this;
      },
      save: async function () {
        // Copy modifications back to Sequelize instance
        for (const [k, v] of Object.entries(this)) {
          if (k === 'save' || k === 'toObject' || k === 'toJSON' || k === 'isModified' || k === 'matchPassword' || k === 'populate') continue;
          let valToSet = v;
          if (v && typeof v === 'object' && !(v instanceof Date)) {
            if (v.id || v._id) {
              const rawField = seqInstance.constructor.rawAttributes[k];
              if (rawField && rawField.type.constructor.name !== 'JSON') {
                valToSet = v.id || v._id;
              }
            } else {
              valToSet = Array.isArray(v) ? [...v] : { ...v };
              seqInstance.changed(k, true);
            }
          }
          seqInstance.set(k, valToSet);
        }
        await seqInstance.save();
        // Update wrapped properties
        const updated = seqInstance.get({ plain: true });
        Object.assign(this, updated);
        this.id = updated.id;
        this._id = updated.id;
        return this;
      }
    };

    // Attach prototype methods to this wrapped object
    if (this.schema.methods) {
      for (const methodName of Object.keys(this.schema.methods)) {
        obj[methodName] = seqInstance[methodName].bind(seqInstance);
      }
    }

    return obj;
  }

  find(query = {}) {
    return new MongooseQuery(this, 'find', [query]);
  }

  findOne(query = {}) {
    return new MongooseQuery(this, 'findOne', [query]);
  }

  findById(id) {
    return new MongooseQuery(this, 'findById', [{ id: id }]);
  }

  async create(data) {
    const sequelize = getSequelize();
    const seqModel = sequelize.models[this.name];

    // Apply schema default values
    const dataWithDefaults = applySchemaDefaults(this.schema, data);

    // Ensure we create a custom id if not provided
    const payload = { id: generateHexId(), ...dataWithDefaults };
    if (payload._id) {
      payload.id = payload._id;
      delete payload._id;
    }
    
    // Instantiate Sequelize model, run hooks via save
    const instance = seqModel.build(payload);
    await instance.save();
    return this.wrapInstance(instance);
  }

  async findByIdAndUpdate(id, update, options = {}) {
    const doc = await this.findOne({ id: id });
    if (!doc) return null;
    Object.assign(doc, update);
    await doc.save();
    return doc;
  }

  async findByIdAndDelete(id) {
    const sequelize = getSequelize();
    const seqModel = sequelize.models[this.name];
    const deletedCount = await seqModel.destroy({ where: { id: id } });
    return deletedCount > 0 ? { id } : null;
  }

  async deleteOne(query = {}) {
    const sequelize = getSequelize();
    const seqModel = sequelize.models[this.name];
    const where = translateQuery(query);
    const instance = await seqModel.findOne({ where });
    if (instance) {
      await instance.destroy();
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  async deleteMany(query = {}) {
    const sequelize = getSequelize();
    const seqModel = sequelize.models[this.name];
    const where = translateQuery(query);
    const deletedCount = await seqModel.destroy({ where });
    return { deletedCount };
  }

  async updateMany(query = {}, update = {}, options = {}) {
    const sequelize = getSequelize();
    const seqModel = sequelize.models[this.name];
    const where = translateQuery(query);

    let updateValues = update;
    if (update && update.$set) {
      updateValues = update.$set;
    }

    const cleanUpdate = {};
    for (const [k, v] of Object.entries(updateValues)) {
      let valToSet = v;
      if (v && typeof v === 'object' && !(v instanceof Date)) {
        if (v.id || v._id) {
          valToSet = v.id || v._id;
        } else {
          valToSet = Array.isArray(v) ? [...v] : { ...v };
        }
      }
      cleanUpdate[k] = valToSet;
    }

    const [affectedCount] = await seqModel.update(cleanUpdate, { where });
    return { acknowledged: true, modifiedCount: affectedCount };
  }

  countDocuments(query = {}) {
    return new MongooseQuery(this, 'countDocuments', [query]);
  }

  async aggregate(pipeline) {
    const sequelize = getSequelize();
    const seqModel = sequelize.models[this.name];

    // Find match stage, if any
    const matchStage = pipeline.find(stage => stage.$match);
    const where = matchStage ? translateQuery(matchStage.$match) : {};

    // Find group stage
    const groupStage = pipeline.find(stage => stage.$group);
    if (!groupStage) return [];

    const groupDef = groupStage.$group;
    const groupField = groupDef._id; // E.g., '$role', '$status', '$serviceId', or { year: { ... } }

    // Find sort and limit stage
    const sortStage = pipeline.find(stage => stage.$sort);
    const limitStage = pipeline.find(stage => stage.$limit);

    // Case 1: Group by year and month
    if (groupField && typeof groupField === 'object') {
      const results = await seqModel.findAll({
        where,
        attributes: [
          [sequelize.fn('YEAR', sequelize.col('createdAt')), 'year'],
          [sequelize.fn('MONTH', sequelize.col('createdAt')), 'month'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: [
          sequelize.fn('YEAR', sequelize.col('createdAt')),
          sequelize.fn('MONTH', sequelize.col('createdAt'))
        ]
      });

      return results.map(r => ({
        _id: {
          year: r.getDataValue('year'),
          month: r.getDataValue('month')
        },
        count: parseInt(r.getDataValue('count') || 0)
      }));
    }

    // Case 2: Group by field (like '$role', '$status', '$serviceId')
    const fieldName = typeof groupField === 'string' ? groupField.replace('$', '') : 'id';
    
    const queryOptions = {
      where,
      attributes: [
        [fieldName, '_id'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [fieldName],
      raw: true
    };

    if (sortStage) {
      queryOptions.order = [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']];
    }

    if (limitStage) {
      queryOptions.limit = limitStage.$limit;
    }

    const results = await seqModel.findAll(queryOptions);
    return results.map(r => ({
      _id: r._id,
      count: parseInt(r.count || 0)
    }));
  }
}

// Default export simulates the mongoose module
const mongoose = {
  Schema,
  Types,
  models: modelsRegistry,
  model(name, schema) {
    if (modelsRegistry[name]) {
      return modelsRegistry[name];
    }
    const model = new ModelWrapper(name, schema);
    modelsRegistry[name] = model;
    return model;
  }
};

export default mongoose;
