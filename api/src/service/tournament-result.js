const { sql } = require("../db");
const scheduleService = require("../service/tournament-schedule");
const formatService = require("../service/tournament-format");

exports.clearResult = async ({ payload: { resultId, match } }) => {
  const [deletedResult] = await sql`
        delete
        from match_results
        where id = ${resultId} returning *`;

  // get selected home/away teamId group ranking first
  const ids =
    (match &&
      Object.values(match)
        .filter((item) => item.teamId)
        .map((item) => item?.teamId)) ||
    [];
  const groupTeams = ids.length
    ? await sql`
                select *
                from groups_teams
                where team_id in ${sql(ids)}
        `
    : [];
  groupTeams.length &&
    groupTeams.forEach((item) => {
      if (item.teamId == match.home?.teamId) {
        match.home.tournamentGroupId = item.tournamentGroupId;
        match.home.teamRanking = item.teamRanking;
      } else if (item.teamId == match.away?.teamId) {
        match.away.tournamentGroupId = item.tournamentGroupId;
        match.away.teamRanking = item.teamRanking;
      }
    });
  // set ref home/away team id to null
  //@formatter:off
  const updatedMatches = await sql`
    UPDATE matches
    SET home_team_id =
            CASE
                WHEN (future_team_reference -> 'home') IS NOT NULL
                    AND (future_team_reference -> 'home' ->> 'type' = 'match')
                    AND (future_team_reference -> 'home' ->> 'id')::INT = ${match.id}::INT
                    THEN NULL
                WHEN ${match.home.tournamentGroupId}::INT IS NOT NULL
                    AND (future_team_reference -> 'home') IS NOT NULL
                    AND (future_team_reference -> 'home' ->> 'type' = 'group')
                    AND (future_team_reference -> 'home' ->> 'id')::INT = ${match.home.tournamentGroupId}::INT
                    AND (
                         (future_team_reference -> 'home' ->> 'position')::INT = ${match.home.teamRanking}::INT
                             OR (future_team_reference -> 'home' ->> 'position')::INT = ${match.away.teamRanking}::INT
                         )
                    THEN NULL
                ELSE home_team_id
                END,
        away_team_id =
            CASE
                WHEN (future_team_reference -> 'away') IS NOT NULL
                    AND (future_team_reference -> 'away' ->> 'type' = 'match')
                    AND (future_team_reference -> 'away' ->> 'id')::INT = ${match.id}::INT
                    THEN NULL
                WHEN ${match.away.tournamentGroupId}::INT IS NOT NULL
                    AND (future_team_reference -> 'away') IS NOT NULL
                    AND (future_team_reference -> 'away' ->> 'type' = 'group')
                    AND (future_team_reference -> 'away' ->> 'id')::INT = ${match.away.tournamentGroupId}::INT
                    AND (
                         (future_team_reference -> 'away' ->> 'position')::INT = ${match.away.teamRanking}::INT
                             OR (future_team_reference -> 'away' ->> 'position')::INT = ${match.home.teamRanking}::INT
                         )
                    THEN NULL
                ELSE away_team_id
                END
    WHERE id <> ${match.id}
      AND (((future_team_reference -> 'home') IS NOT NULL
        AND (future_team_reference -> 'home' ->> 'type' = 'match')
        AND (future_team_reference -> 'home' ->> 'id')::INT = ${match.id}::INT)
        OR ((future_team_reference -> 'away') IS NOT NULL
            AND (future_team_reference -> 'away' ->> 'type' = 'match')
            AND (future_team_reference -> 'away' ->> 'id')::INT = ${match.id}::INT)
        OR (${match.home.tournamentGroupId}::INT IS NOT NULL
            AND (future_team_reference -> 'home') IS NOT NULL
            AND (future_team_reference -> 'home' ->> 'type' = 'group')
            AND (future_team_reference -> 'home' ->> 'id')::INT = ${match.home.tournamentGroupId}::INT
            AND (
                (future_team_reference -> 'home' ->> 'position')::INT = ${match.home.teamRanking}::INT
                    OR (future_team_reference -> 'home' ->> 'position')::INT = ${match.away.teamRanking}::INT
                ))
        OR (${match.away.tournamentGroupId}::INT IS NOT NULL
            AND (future_team_reference -> 'away') IS NOT NULL
            AND (future_team_reference -> 'away' ->> 'type' = 'group')
            AND (future_team_reference -> 'away' ->> 'id')::INT = ${match.away.tournamentGroupId}::INT
            AND (
                (future_team_reference -> 'away' ->> 'position')::INT = ${match.away.teamRanking}::INT
                    OR (future_team_reference -> 'away' ->> 'position')::INT = ${match.home.teamRanking}::INT
                )))
    RETURNING *;
`;
  //@formatter:on

  // set selected home/away team result->score to null
  let updatedScores = [];
  if (updatedMatches.length) {
    const ids = updatedMatches.map((item) => item.id);
    updatedScores = await sql`
            update match_results
            set home_team_score = null,
                away_team_score = null,
                winner_id       = null
            where match_id in ${sql(ids)} returning *;
        `;
  }
  //if match->type = 'group', update tournament_group->ranking_published
  if (match.rankingPublished === true) {
    const updatedGroup = await formatService.saveGroup({
      payload: {
        newGroup: { id: match.groupId, rankingPublished: false },
        onlyEntitySave: true,
      },
    });
  }
  return { deletedResult, updatedMatches, updatedScores };
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
  let targetGroup = { rankingPublished: false };
  let matchesWValidResult = matchWResult.filter(
    (item) => item.matchResultId != null,
  );
  if (matchesWValidResult.length > 0) {
    [targetGroup] = await sql`
            select *
            from tournament_groups
            where id = ${groupId}`;

    const { doubleRoundRobin, teamsPerGroup } = targetGroup;
    const matchCount = (teamsPerGroup * (teamsPerGroup - 1)) / 2;
    const totalMatchCount = doubleRoundRobin ? matchCount * 2 : matchCount;
    targetGroup.rankingPublished =
      totalMatchCount === matchesWValidResult.length;
  }
  if (!targetGroup.rankingPublished) return;
  // update tournament_groups -> ranking_published
  const updatedGroup = await formatService.saveGroup({
    payload: { newGroup: targetGroup, onlyEntitySave: true },
  });

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
  // update groups_teams
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
  payload: { matchResult, updatedMatchHomeTeamId, updatedMatchAwayTeamId },
}) => {
  const [savedMatchResult] = await exports.saveMatchResult({ matchResult });
  let updatedMatches = await exports.updateFutureTeamReferenceForSingleMatch({
    updatedMatchHomeTeamId,
    updatedMatchAwayTeamId,
    matchId: matchResult.matchId,
    winnerId: matchResult.winnerId,
  });

  return { savedMatchResult, updatedMatches };
};

exports.updateFutureTeamReferenceForSingleMatch = async ({
  updatedMatchHomeTeamId,
  updatedMatchAwayTeamId,
  matchId,
  winnerId,
}) => {
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
               m.future_team_reference,
               CASE
                 WHEN m.type = 'group' THEN m.group_team_reference
                 END AS group_team_reference,
               CASE
                   WHEN m.type = 'group' THEN m.group_id
                   WHEN m.type = 'bracket' THEN m.bracket_id
                   WHEN m.type = 'single_match' THEN m.phase_id
               END AS type_id
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
  const titles = { match: {}, group: {} };
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
      homeTeamName: row.homeTeamName,
      awayTeamName: row.awayTeamName,
      homeTeamScore: row.homeTeamScore,
      awayTeamScore: row.awayTeamScore,
      winnerId: row.winnerId,
      fieldId: row.fieldId,
      fieldName: row.fieldName,
      futureTeamReference: row.futureTeamReference,
      groupTeamReference: row.groupTeamReference,
    };
    if (newMatch.type === "group") {
      newMatch.groupId = row.typeId;
    }
    if (newMatch.type === "bracket") {
      newMatch.bracketId = row.typeId;
    }
    if (newMatch.type === "single_match") {
      newMatch.phaseId = row.typeId;
    }
    acc[matchDayId].matches.push(newMatch);

    // store match title
    const { home, away } = newMatch.futureTeamReference || {};

    if (home?.type === "match" && !titles.match[home.id])
      titles.match[home.id] = rows.find(
        (item) => item.matchId === home.id,
      )?.matchName;
    if (away?.type === "match" && !titles.match[away.id])
      titles.match[away.id] = rows.find(
        (item) => item.matchId === away.id,
      )?.matchName;

    // prepare ref->groupId for db fetch
    if (home?.type === "group" && !titles.group[home.id])
      titles.group[home.id] = home.id;
    if (away?.type === "group" && !titles.group[away.id])
      titles.group[away.id] = away.id;

    return acc;
  }, {});

  // as result don't fetch group data, need db query to fetch group data
  const groupIds = Object.values(titles.group).filter((item) => item);
  const fetchedGroups = await sql`
        select id, name
        from tournament_groups
        where tournament_groups.id in ${sql(groupIds)}
    `;
  fetchedGroups.forEach((group) => {
    titles.group[group.id] = group.name;
  });
  // const matchIds = Object.values(titles.match).filter((item) => item);
  // const fetchedMatches = await sql`
  //       select id, name
  //       from matches
  //       where matches.id in ${sql(matchIds)}
  //   `;
  // fetchedMatches.forEach((match) => {
  //   titles.match[match.id] = match.name;
  // });

  // Retrieve matchDays data from scheduleService
  const matchDaysFromService = await scheduleService.getMatchDays({
    tournamentId,
  });

  // Map over matchDays from service, combining data from rows
  return {
    matchDays: matchDaysFromService.map((matchDay) => {
      return {
        ...matchDay,
        matches: matchDays[matchDay.id]?.matches || [],
      };
    }),
    titles,
  };
};
