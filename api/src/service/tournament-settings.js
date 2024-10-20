const CustomError = require("../model/CustomError");
const { sql } = require("../db");

exports.saveMatchDay = async ({ payload: { matchDay } }) => {
  if (!matchDay.id) {
    delete matchDay.id;
  }
  const [upsertedMatchDay] = await sql`
        insert into match_days ${sql(matchDay)} on conflict (id)
        do
        update set ${sql(matchDay)}
            returning *`;
  return upsertedMatchDay;
};

exports.getMatchDays = async ({ tournamentId }) => {
  return sql`
        select id, tournament_id, to_char(match_date, 'YYYY-MM-DD') as match_date
        from match_days
        where tournament_id = ${tournamentId}
        order by match_date desc`;
};

exports.deleteMatchDay = async ({ matchDayId }) => {
  return sql`
        delete
        from match_days
        where id = ${matchDayId} returning *`;
};
