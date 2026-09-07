exports.shorthands = undefined;

exports.up = async (pgm) => {
  pgm.addColumn('time_entries', {
    created_by_name: { type: 'varchar(255)' }
  });

  pgm.sql(`
    UPDATE time_entries te
    SET created_by_name = trim(concat_ws(' ', u.first_name, u.last_name))
    FROM users u
    WHERE u.id = te.user_id
      AND (te.created_by_name IS NULL OR te.created_by_name = '')
  `);

  pgm.alterColumn('time_entries', 'created_by_name', {
    notNull: true,
    default: 'Unknown user'
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('time_entries', 'created_by_name');
};
