const { sql } = require("../db");
const tournamentFormatService = require("../service/tournament-format");
const teamService = require("../service/team");
const mailService = require("../service/sendMail");
const {
  generateNewScheduleEmailContent,
  generateScheduleCreatedEmailContent,
  generateBroadcastEmailContent,
} = require("../others/util");

exports.saveField = async ({ payload: { newField } }) => {
  if (!newField?.id) {
    delete newField.id;
  }
  const [upsertedField] = await sql`
        insert into fields ${sql(newField)} on conflict (id)
        do
        update set ${sql(newField)}
            returning *`;
  return upsertedField;
};

exports.deleteField = async ({ payload: { selectedFieldId, matchIds } }) => {
  let updatedMatches = [];

  if (matchIds.length) {
    const matches = matchIds.map((matchId) => [matchId, null, null, null]);
    updatedMatches = await sql`
            update matches
            set start_time = update_data.startTime::timestamp,
            match_day_id = update_data.matchDayId::int,
            field_id     = update_data.fieldId::int
            from (values ${sql(matches)}) as update_data(id, startTime, matchDayId, fieldId)
            where matches.id = update_data.id:: int
                returning *;`;
  }

  const deletedField = await sql`
        delete
        from fields
        where id = ${selectedFieldId} returning *`;

  return { updatedMatches, deletedField };
};

exports.getMatchDays = async ({ tournamentId }) => {
  return sql`
        select id, tournament_id, to_char(match_date, 'YYYY-MM-DD') as match_date
        from match_days
        where tournament_id = ${tournamentId}
        order by match_date`;
};

exports.getFields = async ({ tournamentId }) => {
  return sql`
        select *
        from fields
        where tournament_id = ${tournamentId}
        order by field_order`;
};

exports.updateMatchesStartTime = async ({ matches }) => {
  if (!matches.length) return;

  matches = matches.map((match) => [
    match.id,
    new Date(match.startTime).toISOString().slice(0, 19),
  ]);
  return sql`
        update matches
        set start_time = update_data.startTime::timestamp
        from (values ${sql(matches)}) as update_data (id, startTime)
        where matches.id = (update_data.id):: int
            returning *;
    `;
};

exports.deleteMatch = async ({
  payload: { selectedMatch, updatingMatches },
}) => {
  return Promise.all([
    tournamentFormatService.updateMatch({
      payload: { newMatch: selectedMatch },
    }),
    exports.updateMatchesStartTime({ matches: updatingMatches }),
  ]);
};

exports.broadcastUpdate = async ({
  payload: { receiverIds, broadcastType, tournament },
}) => {
  //send email
  const teams = await teamService.getTeamsWEmailOptionalById({
    teamIds: receiverIds,
  });
  return Promise.all(
    teams.map((team) => {
      const { bodyHtml, subject } = generateBroadcastEmailContent({
        tournament,
        broadcastType,
      });
      return mailService.sendMail(team.email, subject, bodyHtml);
    }),
  );
};

exports.getSchedule = async ({ tournamentId }) => {
  const rows = await sql`
        SELECT f.id                                                            AS field_id,
               f.name                                                          AS field_name,
               f.field_order                                                   AS field_order,
               f.start_time                                                    AS field_start_time,
               md.id                                                           AS match_day_id,
               md.match_date,
               home_team.name                                                  AS home_team_name,
               away_team.name                                                  AS away_team_name,
               m.id                                                            AS match_id,
               m.name                                                          AS match_name,
               m.type                                                          AS match_type,
               m.start_time                                                    AS match_start_time,
               m.home_team_id,
               m.away_team_id,
               m.future_team_reference,
               CASE
                   WHEN m.type = 'group' THEN m.group_team_reference
                   END                                                         AS group_team_reference,
               CASE WHEN m.type = 'group' THEN m.group_id ELSE NULL END        AS group_id,
               CASE WHEN m.type = 'group' THEN tg.name ELSE NULL END           AS group_name,
               CASE WHEN m.type = 'bracket' THEN m.bracket_id ELSE NULL END    AS bracket_id,
               CASE WHEN m.type = 'bracket' THEN tb.name ELSE NULL END         AS bracket_name,
               CASE WHEN m.type = 'single_match' THEN m.phase_id ELSE NULL END AS phase_id,
               CASE
                   WHEN m.field_id IS NULL OR m.match_day_id IS NULL THEN 'unplanned'
                   ELSE 'planned'
                   END                                                         AS match_status
        FROM matches m
                 LEFT JOIN fields f ON m.field_id = f.id
                 LEFT JOIN match_days md ON m.match_day_id = md.id
                 LEFT JOIN tournament_groups tg ON tg.id = m.group_id AND m.type = 'group'
                 LEFT JOIN tournament_brackets tb ON tb.id = m.bracket_id AND m.type = 'bracket'
                 LEFT JOIN teams home_team ON m.home_team_id = home_team.id
                 LEFT JOIN teams away_team ON m.away_team_id = away_team.id
        WHERE m.tournament_id = ${tournamentId}
        ORDER BY m.start_time;
    `;
  const processedData = await processScheduleData(rows);

  const fields = await exports.getFields({ tournamentId });
  const matchDays = await exports.getMatchDays({ tournamentId });

  const schedule = fields.map((field) => {
    const targetField = processedData.fields[field.id];
    if (!targetField)
      return {
        ...field,
        matchDays: matchDays.map((item) => ({
          id: item.id,
          matches: [],
        })),
      };

    return {
      ...targetField,
      matchDays: matchDays.map((matchDay) => {
        const targetMatchDayMatches = targetField.matchDays[matchDay.id];
        if (!targetMatchDayMatches) return { id: matchDay.id, matches: [] };

        return { id: matchDay.id, matches: targetMatchDayMatches };
      }),
    };
  });
  return {
    schedule: schedule.sort((a, b) => a.fieldOrder - b.fieldOrder),
    fields,
    matchDays,
    unplannedMatches: processedData.unplannedMatches,
    titles: processedData.titles,
  };
};

const processScheduleData = async (rows) => {
  const fields = {}; // To store fields and their match days
  const unplannedMatches = []; // To store unplanned matches
  const titles = { match: {}, group: {} };

  rows.forEach((row) => {
    const matchStatus = row.matchStatus;
    const fieldId = row.fieldId;
    const matchDayId = row.matchDayId;

    const match = {
      id: row.matchId,
      name: row.matchName,
      type: row.matchType,
      hostName:
        row.matchType === "group"
          ? row.groupName
          : row.matchType === "bracket"
            ? row.bracketName
            : row.matchName,
      homeTeamId: row.homeTeamId,
      awayTeamId: row.awayTeamId,
      homeTeamName: row.homeTeamName,
      awayTeamName: row.awayTeamName,
      startTime: row.matchStartTime,
      futureTeamReference: row.futureTeamReference,
      groupTeamReference: row.groupTeamReference,
    };
    if (matchStatus === "unplanned") {
      unplannedMatches.push(match);
    } else {
      if (!fields[fieldId]) {
        fields[fieldId] = {
          id: fieldId,
          name: row.fieldName,
          fieldOrder: row.fieldOrder,
          startTime: row.fieldStartTime,
          matchDays: {},
        };
      }
      if (!fields[fieldId].matchDays[matchDayId]) {
        fields[fieldId].matchDays[matchDayId] = [];
      }
      fields[fieldId].matchDays[matchDayId].push(match);
    }
    // store match title
    const { home, away } = match.futureTeamReference || {};

    if (home?.type === "match" && !titles.match[home.id])
      titles.match[home.id] = rows.find(
        (item) => item.matchId === home.id,
      )?.matchName;
    if (away?.type === "match" && !titles.match[away.id])
      titles.match[away.id] = rows.find(
        (item) => item.matchId === away.id,
      )?.matchName;
    if (home?.type === "group" && !titles.group[home.id])
      titles.group[home.id] = rows.find(
        (item) => item.groupId === home.id,
      )?.groupName;
    if (away?.type === "group" && !titles.group[away.id])
      titles.group[away.id] = rows.find(
        (item) => item.groupId === away.id,
      )?.groupName;
  });
  unplannedMatches.sort((a, b) => a.id - b.id);

  return { fields, unplannedMatches, titles };
};
