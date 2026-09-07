exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('services', {
    id: 'id',
    name: { type: 'varchar(150)', notNull: true, unique: true },
    hourly_rate: { type: 'numeric(10,2)', notNull: true },
    active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') }
  });

  pgm.addConstraint('services', 'services_hourly_rate_nonnegative', {
    check: 'hourly_rate >= 0'
  });

  pgm.createTable('time_entries', {
    id: 'id',
    user_id: {
      type: 'integer',
      notNull: true,
      references: 'users',
      onDelete: 'cascade'
    },
    service_id: {
      type: 'integer',
      notNull: true,
      references: 'services',
      onDelete: 'restrict'
    },
    work_date: { type: 'date', notNull: true },
    hours: { type: 'numeric(7,2)', notNull: true },
    description: { type: 'text', notNull: true },
    hourly_rate: { type: 'numeric(10,2)', notNull: true },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') }
  });

  pgm.addConstraint('time_entries', 'time_entries_hours_positive', {
    check: 'hours > 0'
  });

  pgm.addConstraint('time_entries', 'time_entries_hourly_rate_nonnegative', {
    check: 'hourly_rate >= 0'
  });

  pgm.createIndex('time_entries', ['user_id', 'work_date']);
  pgm.createIndex('time_entries', 'service_id');
};

exports.down = (pgm) => {
  pgm.dropTable('time_entries');
  pgm.dropTable('services');
};
