const { sql } = require("../db");
const scheduleService = require("../service/tournament-schedule");

exports.saveMatchResultByMatchId = async ({
  payload: { matchResult, refData },
}) => {
  const [saveMatchResult] = await sql`
        insert into match_results ${sql(matchResult)} on conflict (match_id)
        do
        update set ${sql(matchResult)}
            returning *`;

  const updatedMatches = await exports.updateFutureTeamReferenceForSingleMatch({
    refData,
    matchId: matchResult.matchId,
    winnerId: matchResult.winnerId,
  });

  return { saveMatchResult, updatedMatches };
};

exports.clearResult = async ({ resultId }) => {
  const [deletedResult] = await sql`
        delete
        from match_results
        where id = ${resultId} returning *`;

  return deletedResult;
};

exports.updateFutureTeamReferenceForSingleMatch = async ({
  refData,
  matchId,
  winnerId,
}) => {
  const { updatedMatchHomeTeamId, updatedMatchAwayTeamId } = refData || {};

  if (!updatedMatchHomeTeamId && !updatedMatchAwayTeamId) return [];

  const looserId =
    updatedMatchHomeTeamId === winnerId
      ? updatedMatchAwayTeamId
      : updatedMatchHomeTeamId;

  // @formatter:off
  const updatedMatches = await sql`
    UPDATE matches
    SET home_team_id          = CASE
      -- If home position is 1 and matches the match ID
                                  WHEN (future_team_reference -> 'home' IS NOT NULL)
                                    AND (future_team_reference -> 'home' ->> 'type' = 'match')
                                    AND (future_team_reference -> 'home' ->> 'id')::INT = ${matchId}
      AND (future_team_reference -> 'home' ->> 'position')::INT = 1
      THEN ${winnerId}

    -- If home position is 2 and matches the match ID
      WHEN (future_team_reference -> 'home' IS NOT NULL)
      AND (future_team_reference -> 'home' ->> 'type' = 'match')
      AND (future_team_reference -> 'home' ->> 'id')::INT = ${matchId}
      AND (future_team_reference -> 'home' ->> 'position')::INT = 2
      THEN ${looserId}

      ELSE home_team_id -- Retain current value if no conditions met
    END,

    away_team_id          = CASE
        -- If away position is 1 and matches the match ID
                                WHEN (future_team_reference -> 'away' IS NOT NULL)
                                    AND (future_team_reference -> 'away' ->> 'type' = 'match')
                                    AND (future_team_reference -> 'away' ->> 'id')::INT = ${matchId}
    AND (future_team_reference -> 'away' ->> 'position')::INT = 1
    THEN ${winnerId}

    -- If away position is 2 and matches the match ID
    WHEN (future_team_reference -> 'away' IS NOT NULL)
    AND (future_team_reference -> 'away' ->> 'type' = 'match')
    AND (future_team_reference -> 'away' ->> 'id')::INT = ${matchId}
    AND (future_team_reference -> 'away' ->> 'position')::INT = 2
    THEN ${looserId}

    ELSE away_team_id -- Retain current value if no conditions met
    END,

    -- Directly nullify 'home' in future_team_reference if we are updating home_team_id
    future_team_reference = jsonb_set(
            jsonb_set(
                    future_team_reference,
                    '{home}',
                    CASE
                        WHEN (future_team_reference -> 'home' IS NOT NULL)
                            AND (future_team_reference -> 'home' ->> 'type' = 'match')
                            AND (future_team_reference -> 'home' ->> 'id')::INT = ${matchId}
    THEN 'null'::jsonb
    ELSE future_team_reference -> 'home'
    END
    ),
    -- Directly nullify 'away' in future_team_reference if we are updating away_team_id
    '{away}',
    CASE
    WHEN (future_team_reference -> 'away' IS NOT NULL)
    AND (future_team_reference -> 'away' ->> 'type' = 'match')
    AND (future_team_reference -> 'away' ->> 'id')::INT = ${matchId}
    THEN 'null'::jsonb
    ELSE future_team_reference -> 'away'
    END
    )
    WHERE (future_team_reference -> 'home' ->> 'id')::INT = ${matchId}
    OR (future_team_reference -> 'away' ->> 'id')::INT = ${matchId} -- Only update relevant rows
    RETURNING *;
  `;

  // @formatter:on
  return updatedMatches;
};

exports.getResults = async ({ tournamentId }) => {
  const rows = await sql`
        SELECT m.id           AS match_id,
               m.name         AS match_name,
               m.type         AS match_type,
               m.start_time,
               m.home_team_id,
               m.away_team_id,
               home_team.name AS home_team_name,
               away_team.name AS away_team_name,
               f.id           AS field_id,
               f.name         AS field_name,
               md.id          AS match_day_id,
               md.match_date,
               mr.id          AS result_id,
               mr.home_team_score,
               mr.away_team_score,
               mr.winner_id
        FROM matches m
                 LEFT JOIN fields f ON m.field_id = f.id
                 LEFT JOIN match_days md ON m.match_day_id = md.id
                 LEFT JOIN match_results mr ON m.id = mr.match_id
                 LEFT JOIN teams home_team ON m.home_team_id = home_team.id
                 LEFT JOIN teams away_team ON m.away_team_id = away_team.id
        WHERE m.tournament_id = ${tournamentId}
        ORDER BY md.match_date, m.start_time;
    `;

  // Process rows into matchDays object
  const matchDays = rows.reduce((acc, row) => {
    const { matchDayId } = row;

    if (!acc[matchDayId]) {
      acc[matchDayId] = {
        id: matchDayId,
        matchDate: row.matchDate,
        matches: [],
      };
    }

    acc[matchDayId].matches.push({
      id: row.matchId,
      resultId: row.resultId,
      name: row.matchName,
      type: row.matchType,
      startTime: row.startTime,
      homeTeamId: row.homeTeamId,
      awayTeamId: row.awayTeamId,
      homeTeamName: row.homeTeamName, //TODO: if teamId not available, send teamOptions
      awayTeamName: row.awayTeamName, //TODO: if teamId not available, send teamOptions
      homeTeamScore: row.homeTeamScore,
      awayTeamScore: row.awayTeamScore,
      winnerId: row.winnerId,
      fieldId: row.fieldId,
      fieldName: row.fieldName,
    });

    return acc;
  }, {});

  // Retrieve matchDays data from scheduleService
  const matchDaysFromService = await scheduleService.getMatchDays({
    tournamentId,
  });

  // Map over matchDays from service, combining data from rows
  return matchDaysFromService.map((matchDay) => {
    return {
      ...matchDay,
      matches: matchDays[matchDay.id]?.matches || [],
    };
  });
};
