const { sql } = require("../db");
const scheduleService = require("../service/tournament-schedule");
const { raw } = require("express");
const { removeOtherParams } = require("../others/util");

exports.clearResult = async ({ resultId }) => {
  const [deletedResult] = await sql`
        delete
        from match_results
        where id = ${resultId} returning *`;

  return deletedResult;
};

exports.saveMatchResult = async ({ matchResult }) => {
  if (!matchResult.id) delete matchResult.id;
  return sql`
        insert into match_results ${sql(matchResult)} on conflict (match_id)
        do
        update set ${sql(matchResult)}
            returning *`;
};

exports.saveGroupMatchResult = async ({
  payload: { matchResult, groupId },
}) => {
  const [savedMatchResult] = await exports.saveMatchResult({ matchResult });
  let updatedMatches = await exports.updateGroupTeamReferenceForGroupMatches({
    groupId,
    matchResult,
  });
  return { savedMatchResult, updatedMatches };
};

exports.updateGroupTeamReferenceForGroupMatches = async ({
  groupId,
  matchResult,
}) => {
  const matchWResult = await sql`
        SELECT *,
               m.id  AS match_id,
               mr.id AS match_result_id
        FROM matches m
                 LEFT JOIN match_results mr
                           ON m.id = mr.match_id
        WHERE m.group_id = ${groupId};
    `;

  const teamStats = await sql`
        SELECT *,
               gt.id  AS group_team_id,
               gts.id AS stat_id
        FROM groups_teams gt
                 LEFT JOIN groups_teams_stats gts
                           ON gt.id = gts.groups_teams_id
        WHERE gt.tournament_group_id = ${groupId};
    `;

  //update stats
  //find current updated match result, to find current selected match home/away team id
  const updatedMatchWResult = matchWResult.find(
    (item) => item.matchId === matchResult.matchId,
  );
  const singleWinReward = 3;
  const singleDrawReward = 1;
  const homeTeamId = updatedMatchWResult.homeTeamId;
  const awayTeamId = updatedMatchWResult.awayTeamId;

  const statInit = {
    played: 0,
    won: 0,
    draw: 0,
    lost: 0,
    points: 0,
    goalsFor: 0,
    goalsAway: 0,
    goalDifference: 0,
  };
  let homeTeamStatsSrc = teamStats.find((item) => item.teamId === homeTeamId);
  let awayTeamStatsSrc = teamStats.find((item) => item.teamId === awayTeamId);

  const homeTeamStats = {
    id: homeTeamStatsSrc.id,
    ...statInit,
  };
  const awayTeamStats = {
    id: awayTeamStatsSrc.id,
    ...statInit,
  };

  matchWResult.forEach((row) => {
    if (row.homeTeamId === homeTeamId || row.awayTeamId === homeTeamId) {
      const isHomeWinner = homeTeamId === row.winnerId;
      homeTeamStats.played += 1;
      homeTeamStats.goalsFor += row.homeTeamScore;
      homeTeamStats.goalDifference += row.homeTeamScore - row.awayTeamScore;

      if (row.homeTeamScore === row.awayTeamScore && !row.winnerId) {
        homeTeamStats.draw += 1;
        homeTeamStats.points += singleDrawReward;
      } else if (isHomeWinner) {
        homeTeamStats.won += 1;
        homeTeamStats.points += singleWinReward;
      } else if (!isHomeWinner) {
        homeTeamStats.lost += 1;
      }
    }
    if (row.homeTeamId === awayTeamId || row.awayTeamId === awayTeamId) {
      const isAwayWinner = awayTeamId === row.winnerId;
      awayTeamStats.played += 1;
      awayTeamStats.goalsFor += row.awayTeamScore;
      awayTeamStats.goalDifference +=
        (row.awayTeamScore ?? 0) - (row.homeTeamScore ?? 0);
      awayTeamStats.goalsAway += row.awayTeamScore;

      if (row.homeTeamScore === row.awayTeamScore && !row.winnerId) {
        awayTeamStats.draw += 1;
        awayTeamStats.points += singleDrawReward;
      } else if (isAwayWinner) {
        awayTeamStats.won += 1;
        awayTeamStats.points += singleWinReward;
      } else if (!isAwayWinner) {
        awayTeamStats.lost += 1;
      }
    }
  });
  const newGroupTeamStats = [homeTeamStats, awayTeamStats].map((item) => [
    ...Object.values(item),
  ]);

  const updatedGroupTeamStats = await sql`
        UPDATE groups_teams_stats
        SET played = update_data.played::int,
          won = update_data.won::int,
          draw = update_data.draw::int,
          lost = update_data.lost::int,
          points = update_data.points::int,
          goals_for = update_data.goals_for::int,
          goals_away = update_data.goals_away::int,
          goal_difference = update_data.goal_difference::int
        FROM (
            VALUES ${sql(newGroupTeamStats)}
            ) AS update_data (id, played, won, draw, lost, points, goals_for, goals_away, goal_difference)
        WHERE groups_teams_stats.id = update_data.id:: int
            RETURNING *;
    `;
  // const allowedKeys = [
  //   "id",
  //   "played",
  //   "won",
  //   "draw",
  //   "lost",
  //   "points",
  //   "goalsFor",
  //   "goalsAway",
  //   "goalDifference",
  //   "groupsTeamsId",
  // ];
  // const resultExistsPreSave = !!matchResult.resultId;
  // check if score, winner id changed, if so then update group_team_stats
  // let winnerIdChanged = false;
  // let scoresChanged = false;
  // if (oldMatchResult){
  //   winnerIdChanged = matchResult.winnerId !== oldMatchResult.winnerId;
  //   scoresChanged =
  //       matchResult.homeTeamScore !== oldMatchResult.homeTeamScore ||
  //       matchResult.awayTeamScore !== oldMatchResult.awayTeamScore;
  // }

  let rankingPublished = false;
  let matchesWValidResult = matchWResult.filter(
    (item) => item.matchResultId != null,
  );
  if (matchesWValidResult.length > 0) {
    const [targetGroup] = await sql`
            select *
            from tournament_groups
            where id = ${groupId}`;

    const { doubleRoundRobin, teamsPerGroup } = targetGroup;
    const matchCount = (teamsPerGroup * (teamsPerGroup - 1)) / 2;
    const totalMatchCount = doubleRoundRobin ? matchCount * 2 : matchCount;
    rankingPublished = totalMatchCount === matchesWValidResult.length;
  }
  if (!rankingPublished) return;
  // update groups_teams and matches table
  //sort team stats
  const sortedTeamStats = teamStats.sort((a, b) => {
    // First sort by points in descending order
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    // If points are the same, sort by goalsFor in descending order
    if (b.goalsFor !== a.goalsFor) {
      return b.goalsFor - a.goalsFor;
    }
    // If points and goalsFor are the same, sort by goalDifference in descending order
    return b.goalDifference - a.goalDifference;
  });
  const newGroupTeam = sortedTeamStats.map((item, index) => [
    Number(item.groupTeamId),
    index + 1,
  ]);
  const updatedGroupTeam = await sql`
        update groups_teams
        set team_ranking = update_data.teamRanking::int
        from (values ${sql(newGroupTeam)}) as update_data (id, teamRanking)
        where groups_teams.id = (update_data.id):: int
            returning *;
    `;
  const formattedGroupTeam = updatedGroupTeam.map((item) => [
    Number(item.id),
    item.tournamentGroupId,
    item.teamId,
    item.teamRanking,
  ]);
  //update matches homeTeamId, awayTeamId
  // @formatter:off
  const updatedMatches = await sql`
  UPDATE matches
  SET home_team_id = CASE
      WHEN (future_team_reference -> 'home') IS NOT NULL
           AND (future_team_reference -> 'home' ->> 'type' = 'group')
           AND (future_team_reference -> 'home' ->> 'id')::INT = (update_data.tournamentGroupId)::INT
           AND (future_team_reference -> 'home' ->> 'position')::INT = (update_data.teamRanking)::INT
      THEN update_data.teamId::INT
      ELSE home_team_id::INT
  END,
      away_team_id = CASE
      WHEN (future_team_reference -> 'away') IS NOT NULL
           AND (future_team_reference -> 'away' ->> 'type' = 'group')
           AND (future_team_reference -> 'away' ->> 'id')::INT = (update_data.tournamentGroupId)::INT
           AND (future_team_reference -> 'away' ->> 'position')::INT = (update_data.teamRanking)::INT
      THEN update_data.teamId::INT
      ELSE away_team_id::INT
  END
  FROM (VALUES ${sql(formattedGroupTeam)}) AS update_data (groupTeamId, tournamentGroupId, teamId, teamRanking)
  WHERE (future_team_reference -> 'home' ->> 'id')::INT = (update_data.tournamentGroupId)::INT
    AND (future_team_reference -> 'home' ->> 'position')::INT = (update_data.teamRanking)::INT
  OR (future_team_reference -> 'away' ->> 'id')::INT = (update_data.tournamentGroupId)::INT
    AND (future_team_reference -> 'away' ->> 'position')::INT = (update_data.teamRanking)::INT
  RETURNING *;
  `;
  // @formatter:on
  return updatedMatches;
};

exports.saveSingleMatchResult = async ({
  payload: { matchResult, refData },
}) => {
  const [savedMatchResult] = await exports.saveMatchResult({ matchResult });
  let updatedMatches = await exports.updateFutureTeamReferenceForSingleMatch({
    refData,
    matchId: matchResult.matchId,
    winnerId: matchResult.winnerId,
  });

  return { savedMatchResult, updatedMatches };
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
  SET home_team_id
          = CASE
                WHEN (future_team_reference -> 'home' IS NOT NULL)
                    AND (future_team_reference -> 'home' ->> 'type' = 'match')
                    AND (future_team_reference -> 'home' ->> 'id')::INT = ${matchId}
                    AND (future_team_reference -> 'home' ->> 'position')::INT = 1
                    THEN ${winnerId}
                WHEN (future_team_reference -> 'home' IS NOT NULL)
                    AND (future_team_reference -> 'home' ->> 'type' = 'match')
                    AND (future_team_reference -> 'home' ->> 'id')::INT = ${matchId}
                    AND (future_team_reference -> 'home' ->> 'position')::INT = 2
                    THEN ${looserId}
                ELSE home_team_id
          END,
      away_team_id
          = CASE
                WHEN (future_team_reference -> 'away' IS NOT NULL)
                    AND (future_team_reference -> 'away' ->> 'type' = 'match')
                    AND (future_team_reference -> 'away' ->> 'id')::INT = ${matchId}
                    AND (future_team_reference -> 'away' ->> 'position')::INT = 1
                    THEN ${winnerId}
                WHEN (future_team_reference -> 'away' IS NOT NULL)
                    AND (future_team_reference -> 'away' ->> 'type' = 'match')
                    AND (future_team_reference -> 'away' ->> 'id')::INT = ${matchId}
                    AND (future_team_reference -> 'away' ->> 'position')::INT = 2
                    THEN ${looserId}
                ELSE away_team_id
          END
  WHERE (future_team_reference -> 'home' ->> 'id')::INT = ${matchId}
     OR (future_team_reference -> 'away' ->> 'id')::INT = ${matchId}
  RETURNING *;
  `;
  // @formatter:on
  return updatedMatches;
};

exports.getResults = async ({ tournamentId }) => {
  // @formatter:off
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
               mr.winner_id,
               CASE
                   WHEN m.type = 'group' THEN m.group_id
                   WHEN m.type = 'bracket' THEN m.bracket_id
                   WHEN m.type = 'single_match' THEN m.phase_id
               END AS type_id,
               CASE
                   WHEN m.type = 'group' THEN m.group_team_reference
                   WHEN m.type = 'bracket' THEN m.future_team_reference                
               END AS reference
        FROM matches m
                 LEFT JOIN fields f ON m.field_id = f.id
                 LEFT JOIN match_days md ON m.match_day_id = md.id
                 LEFT JOIN match_results mr ON m.id = mr.match_id
                 LEFT JOIN teams home_team ON m.home_team_id = home_team.id
                 LEFT JOIN teams away_team ON m.away_team_id = away_team.id
        WHERE m.tournament_id = ${tournamentId}
        ORDER BY md.match_date, m.start_time;
    `;
  // @formatter:on
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
    const newMatch = {
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
    };
    if (newMatch.type === "group") {
      newMatch.groupId = row.typeId;
      newMatch.groupTeamReference = row.reference;
    }
    if (newMatch.type === "bracket") {
      newMatch.bracketId = row.typeId;
      newMatch.futureTeamReference = row.reference;
    }
    if (newMatch.type === "single_match") {
      newMatch.phaseId = row.typeId;
      newMatch.futureTeamReference = row.reference;
    }
    acc[matchDayId].matches.push(newMatch);

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
