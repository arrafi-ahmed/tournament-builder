const { sql } = require("../db");

exports.getTournamentStanding = async ({ tournamentId }) => {
  const rawData = await sql`
        SELECT md.id                                                             AS match_day_id,
               md.match_date,
               m.id                                                              AS match_id,
               m.name                                                            AS match_name,
               m.type                                                            AS match_type,
               m.start_time,
               m.home_team_id,
               m.away_team_id,
               m.future_team_reference,
               mr.home_team_score,
               mr.away_team_score,
               mr.winner_id,
               f.id                                                              AS field_id,
               f.name                                                            AS field_name,
               tp.id                                                             AS phase_id,
               tp.name                                                           AS phase_name,
               tp.order                                                          AS phase_order,
               CASE WHEN m.type = 'group' THEN tg.id ELSE NULL END               AS group_id,
               CASE WHEN m.type = 'group' THEN tg.name ELSE NULL END             AS group_name,
               CASE WHEN m.type = 'group' THEN gt.team_id ELSE NULL END          AS team_id,
               CASE WHEN m.type = 'group' THEN t3.name ELSE NULL END             AS team_name,
               CASE WHEN m.type = 'group' THEN gt.team_ranking ELSE NULL END     AS team_ranking,
               CASE WHEN m.type = 'group' THEN gts.played ELSE NULL END          AS played,
               CASE WHEN m.type = 'group' THEN gts.won ELSE NULL END             AS won,
               CASE WHEN m.type = 'group' THEN gts.draw ELSE NULL END            AS draw,
               CASE WHEN m.type = 'group' THEN gts.lost ELSE NULL END            AS lost,
               CASE WHEN m.type = 'group' THEN gts.points ELSE NULL END          AS points,
               CASE WHEN m.type = 'group' THEN gts.goals_for ELSE NULL END       AS goals_for,
               CASE WHEN m.type = 'group' THEN gts.goals_away ELSE NULL END      AS goals_away,
               CASE WHEN m.type = 'group' THEN gts.goal_difference ELSE NULL END AS goal_difference,
               t1.name                                                           AS home_team_name,
               t2.name                                                           AS away_team_name,
               m.round_type,
               tb.id                                                             AS bracket_id,
               tb.name                                                           AS bracket_name
        FROM match_days md
                 LEFT JOIN matches m ON md.id = m.match_day_id
                 LEFT JOIN match_results mr ON m.id = mr.match_id
                 LEFT JOIN fields f ON m.field_id = f.id
                 LEFT JOIN tournament_phases tp ON m.phase_id = tp.id
                 LEFT JOIN tournament_brackets tb ON tb.id = m.bracket_id AND m.type = 'bracket'
                 LEFT JOIN tournament_groups tg ON tp.id = tg.tournament_phase_id AND m.type = 'group'
                 LEFT JOIN groups_teams gt ON tg.id = gt.tournament_group_id AND m.type = 'group'
                 LEFT JOIN groups_teams_stats gts ON gt.id = gts.groups_teams_id AND m.type = 'group'
                 LEFT JOIN teams t3 ON gt.team_id = t3.id AND m.type = 'group'
                 LEFT JOIN teams t1 ON m.home_team_id = t1.id
                 LEFT JOIN teams t2 ON m.away_team_id = t2.id
        WHERE tp.tournament_id = ${tournamentId}
        ORDER BY tp.order, md.match_date, m.start_time;
    `;

  const schedule = [];
  const standing = [];

  rawData.forEach((item) => {
    let {
      matchDayId,
      matchDate,
      matchId,
      matchName,
      matchType,
      startTime,
      homeTeamId,
      awayTeamId,
      futureTeamReference,
      homeTeamScore,
      awayTeamScore,
      winnerId,
      fieldId,
      fieldName,
      phaseId,
      phaseName,
      groupId,
      groupName,
      teamId,
      teamName,
      played,
      won,
      draw,
      lost,
      points,
      goalsFor,
      goalsAway,
      goalDifference,
      teamRanking,
      homeTeamName,
      awayTeamName,
      roundType,
      bracketId,
      bracketName,
    } = item;

    // replace home/away team name with ref if teamId null
    if (!homeTeamId) {
      const {
        home: { id, type, position },
      } = futureTeamReference;

      if (type === "match") {
        const foundRow = rawData.find((row) => row.matchId === id);
        homeTeamName =
          (position === 1 ? "Winner" : "Loser") + `, ${foundRow.matchName}`;
      } else if (type === "group") {
        const foundRow = rawData.find((row) => row.groupId === id);
        homeTeamName = `${foundRow.groupName}, Ranking ${position}`;
      }
    }
    if (!awayTeamId) {
      const {
        away: { id, type, position },
      } = futureTeamReference;

      if (type === "match") {
        const foundRow = rawData.find((row) => row.matchId === id);
        awayTeamName =
          (position === 1 ? "Winner" : "Loser") + `, ${foundRow.matchName}`;
      } else if (type === "group") {
        const foundRow = rawData.find((row) => row.groupId === id);
        awayTeamName = `${foundRow.groupName}, ` + `, Ranking ${position}`;
      }
    }

    // 1. Schedule data grouped by match day
    let matchDay = schedule.find((md) => md.matchDayId === matchDayId);
    if (!matchDay) {
      matchDay = {
        matchDayId,
        matchDate,
        matches: [],
      };
      schedule.push(matchDay);
    }
    if (matchId && !matchDay.matches.some((m) => m.matchId === matchId)) {
      matchDay.matches.push({
        matchId,
        name: matchName,
        type: matchType,
        startTime,
        homeTeamId,
        awayTeamId,
        futureTeamReference,
        homeTeamScore,
        awayTeamScore,
        winnerId,
        fieldId,
        fieldName,
        homeTeamName,
        awayTeamName,
        hostName:
          matchType === "group"
            ? groupName
            : matchType === "bracket"
              ? bracketName
              : "Match",
      });
    }

    // 2. Standings data grouped by phase
    let phaseEntry = standing.find((p) => p.phaseId === phaseId);
    if (!phaseEntry) {
      phaseEntry = {
        phaseId,
        phaseName,
        items: [],
      };
      standing.push(phaseEntry);
    }

    // Handle group items
    if (matchType === "group" && groupId) {
      let groupEntry = phaseEntry.items.find(
        (i) => i.groupId === groupId && i.type === "group",
      );
      if (!groupEntry) {
        groupEntry = {
          type: "group",
          groupId,
          name: groupName,
          teamStats: [],
        };
        phaseEntry.items.push(groupEntry);
      }
      if (teamId && !groupEntry.teamStats.some((t) => t.teamId === teamId)) {
        groupEntry.teamStats.push({
          teamId,
          teamName,
          played,
          won,
          draw,
          lost,
          points,
          goalsFor,
          goalsAway,
          goalDifference,
          teamRanking,
        });
      }
    } else if (matchType === "bracket") {
      // Add bracket entry with rounds
      let bracketEntry = phaseEntry.items.find((i) => i.type === "bracket");
      if (!bracketEntry) {
        bracketEntry = {
          type: "bracket",
          bracketId,
          name: bracketName,
          rounds: [],
        };
        phaseEntry.items.push(bracketEntry);
      }

      let roundEntry = bracketEntry.rounds.find(
        (i) => i.roundType === roundType,
      );
      if (roundType && !roundEntry) {
        // Push the round into the bracket entry
        roundEntry = {
          roundType,
          matches: [],
        };
        bracketEntry.rounds.push(roundEntry);
      }
      // Add match to the appropriate round type group
      roundEntry.matches.push({
        matchId,
        name: matchName,
        startTime,
        homeTeamId,
        awayTeamId,
        futureTeamReference,
        homeTeamScore,
        awayTeamScore,
        winnerId,
        fieldId,
        fieldName,
        homeTeamName,
        awayTeamName,
      });
    } else if (matchType === "single_match") {
      // Add single matches directly into the phase items without nesting
      phaseEntry.items.push({
        type: "single_match",
        matchId,
        name: matchName,
        startTime,
        homeTeamId,
        awayTeamId,
        futureTeamReference,
        homeTeamScore,
        awayTeamScore,
        winnerId,
        fieldId,
        fieldName,
        homeTeamName,
        awayTeamName,
      });
    }
  });

  // Sort groups by groupId and teams by teamRanking within each group
  standing.forEach((phase) => {
    phase.items.sort((a, b) => {
      if (a.type === "group" && b.type === "group") {
        return a.groupId - b.groupId;
      }
      return 0;
    });
  });

  return { standing, schedule };
};