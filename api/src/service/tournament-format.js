const { sql } = require("../db");
const tournamentService = require("../service/tournament");

exports.addPhase = async ({ payload }) => {

};

exports.getTournamentFormat = async ({ tournamentId, organizerId }) => {
  let result = await sql`
        SELECT tp.id                    AS phase_id,
               tp.name                  AS phase_name,
               tp.phase_order,
               tg.id                    AS group_id,
               tg.name                  AS group_name,
               tg.group_order,
               tg.double_round_robin,
               tg.groups_count,
               tg.teams_per_group,
               gt.id                    AS group_team_id,
               gt.team_ranking,
               gt.team_id               AS team_id,
               t1.name                  AS group_team_name, -- Group team name
               gt.future_team_reference AS group_future_team_reference,
               tb.id                    AS bracket_id,
               tb.name                  AS bracket_name,
               tb.bracket_order,
               tb.teams_count,
               m.id                     AS match_id,
               m.name                   AS match_name,
               m.match_type,
               m.match_order,
               m.future_team_reference  AS match_future_team_reference,
               m.round_type,
               m.start_time,
               m.home_team_id,
--                t2.name                  AS home_team_name,  -- Home team name
               m.away_team_id,
--                t3.name                  AS away_team_name,  -- Away team name
               mr.home_team_score,
               mr.away_team_score
        FROM tournament_phases tp
                 LEFT JOIN tournament_groups tg ON tg.tournament_phase_id = tp.id
                 LEFT JOIN groups_teams gt ON gt.tournament_group_id = tg.id
                 LEFT JOIN teams t1 ON t1.id = gt.team_id -- Join for group team name
                 LEFT JOIN tournament_brackets tb ON tb.tournament_phase_id = tp.id
                 LEFT JOIN matches m ON m.tournament_phase_id = tp.id
            --                  LEFT JOIN teams t2 ON t2.id = m.home_team_id -- Join for home team name
--                  LEFT JOIN teams t3 ON t3.id = m.away_team_id -- Join for away team name
                 LEFT JOIN match_results mr ON mr.match_id = m.id
        WHERE tp.tournament_id = ${tournamentId}
        ORDER BY tp.phase_order ASC,
                 tb.bracket_order ASC,
                 m.round_type DESC,
                 m.match_order ASC;`;

  result = tournamentId == 6 ? demoData : result;

  return processTournamentData({
    rawData: result,
    tournamentId,
    organizerId,
  });
};

const processTournamentData = async ({
  rawData,
  tournamentId,
  organizerId,
}) => {
  // console.log(1, rawData)
  let phasesMap = new Map();
  const participants = await tournamentService.getParticipants({
    tournamentId,
    organizerId,
  });
  const groups = {};
  const teams = {};
  const matches = {};
  const teamOptions = {};
  const selectedTeamOptions = {};

  rawData.forEach((row) => {
    // Get or create the phase
    if (!phasesMap.has(row.phaseId)) {
      phasesMap.set(row.phaseId, {
        id: row.phaseId,
        name: row.phaseName,
        phaseOrder: row.phaseOrder,
        items: [],
      });
    }
    const phase = phasesMap.get(row.phaseId);

    // Process group data if available
    if (row.groupId) {
      let group = phase.items.find(
        (item) => item.type === "group" && item.id === row.groupId
      );
      if (!group) {
        group = {
          id: row.groupId,
          type: "group",
          name: row.groupName,
          order: row.groupOrder,
          doubleRoundRobin: row.doubleRoundRobin,
          groupsCount: row.groupsCount,
          teamsPerGroup: row.teamsPerGroup,
          teams: [], // Initialize an empty array for teams
          matches: [],
        };
        phase.items.push(group);
      }

      if (row.teamId) {
        const teamExists = group.teams.some((team) => team.id === row.teamId);

        if (!teamExists) {
          group.teams.push({
            id: row.groupTeamId,
            teamId: row.teamId,
            name: row.groupTeamName,
            teamRanking: row.teamRanking,
            futureTeamReference: row.groupFutureTeamReference,
          });
        }
      }
      if (row.matchId) {
        const matchExists = group.matches.some(
          (match) => match.id === row.matchId
        );

        if (!matchExists) {
          group.matches.push({
            id: row.matchId,
            name: row.matchName,
            order: row.matchOrder,
            type: row.matchType,
            startTime: row.startTime,
            homeTeamId: row.homeTeamId,
            awayTeamId: row.awayTeamId,
            homeTeamScore: row.homeTeamScore,
            awayTeamScore: row.awayTeamScore,
            futureTeamReference: row.matchFutureTeamReference,
          });
        }
      }
    }

    // Process bracket data if available
    else if (row.bracketId) {
      let bracket = phase.items.find(
        (item) => item.type === "bracket" && item.id === row.bracketId
      );
      if (!bracket) {
        bracket = {
          id: row.bracketId,
          type: row.matchType,
          name: row.bracketName,
          order: row.bracketOrder,
          teamsCount: row.teamsCount,
          rounds: {}, // Initialize an empty array for rounds
        };
        phase.items.push(bracket);
      }

      // Add round data to the bracket
      if (row.matchId) {
        // console.log(31, row);

        const match = {
          id: row.matchId,
          name: row.matchName,
          type: row.matchType,
          order: row.matchOrder,
          startTime: row.startTime,
          homeTeamId: row.homeTeamId,
          awayTeamId: row.awayTeamId,
          homeTeamScore: row.homeTeamScore,
          awayTeamScore: row.awayTeamScore,
          futureTeamReference: row.matchFutureTeamReference,
        };

        if (!bracket.rounds[row.roundType]) {
          bracket.rounds[row.roundType] = {
            type: row.roundType,
            matches: [{ ...match }],
          };
        } else {
          bracket.rounds[row.roundType].matches.push({ ...match });
        }
      }
    }

    // Process single matches
    else if (row.matchType === "single_match") {
      phase.items.push({
        id: row.matchId,
        name: row.matchName,
        type: "single_match",
        order: row.matchOrder,
        startTime: row.startTime,
        homeTeamId: row.homeTeamId,
        awayTeamId: row.awayTeamId,
        homeTeamScore: row.homeTeamScore,
        awayTeamScore: row.awayTeamScore,
        futureTeamReference: row.matchFutureTeamReference,
      });
    }
  });

  // Convert Maps back to arrays and sort items
  phasesMap = Array.from(phasesMap.values()).map((phase) => {
    // Sort items by their order
    phase.items.sort((a, b) => a.order - b.order);

    // Sort rounds and matches within brackets
    phase.items.forEach((item) => {
      if (item.type === "bracket") {
        // convert rounds from obj to arr
        item.rounds = Object.values(item.rounds).sort(
          (a, b) => b.type - a.type
        );
        item.rounds.forEach((round) => {
          round.matches.sort((a, b) => a.order - b.order);
        });
      }
    });
    return phase;
  });
  // return phasesMap;

  if (!phasesMap.length) return;
  populateTeamOptionsWParticipants();

  const entityCount = { phase: 0, group: 0, bracket: 0, match: 0 };
  // populate groups/teams/matches
  phasesMap.forEach((phase) => {
    phase.items.forEach((phaseItem) => {
      if (phaseItem.type == "group") {
        if (!groups[phaseItem.id]) {
          groups[phaseItem.id] = phaseItem;
          entityCount.group++;
        }
        if (phaseItem.teams?.length) {
          phaseItem.teams.forEach((team) => {
            if (team.teamId && !teams[team.teamId]) {
              teams[team.teamId] = team;
            }
          });
        }
      } else if (phaseItem.type == "single_match") {
        if (!matches[phaseItem.id]) {
          matches[phaseItem.id] = phaseItem;
          entityCount.match++;
        }
      } else if (phaseItem.type == "bracket") {
        if (phaseItem.rounds?.length) {
          phaseItem.rounds.forEach((round) => {
            // todo: for bracket rankingPublished, check match result published for prev round
            round.matches.forEach((match) => {
              if (!matches[match.id]) {
                matches[match.id] = match;
                entityCount.match++;
              }
            });
          });
        }
        entityCount.bracket++;
      }
    });
    entityCount.phase++;
  });

  // populate TeamOptions
  phasesMap.forEach((phase) => {
    phase.items.forEach((phaseItem, phaseIndex) => {
      if (phaseItem.type == "group" && phaseItem.teams?.length) {
        // phaseItem.teams.forEach((team) => {
        //   populateGroupSelectedOption(team);
        // });
        populateTeamOptions(phaseItem, phase.id);
      } else if (phaseItem.type == "single_match") {
        // populateMatchSelectedOption(phaseItem);
        populateTeamOptions(phaseItem, phase.id);
      } else if (phaseItem.type == "bracket") {
        if (phaseItem.rounds?.length) {
          phaseItem.rounds.forEach((round) => {
            round.matches.forEach((match) => {
              // populateMatchSelectedOption(match);
              match.type = "single_match";
              populateTeamOptions(match, phase.id);
            });
          });
        }
      }
    });
  });

  // console.log(5, teamOptions);

  function populateTeamOptionsWParticipants() {
    teamOptions["empty"] = {
      name: `Empty Slot`,
      used: false,
      phase: 0,
      id: "empty",
    };

    participants.forEach((team, teamIndex) => {
      // for team type only input valid team with id
      if (team.id) {
        const id = `t-${team.id}`;
        teamOptions[id] = {
          name: team.name,
          used: false,
          phase: 0, // all teams phase is 0 as visible in phase 1 dropdown options
          id,
          itemId: null, //team.teamId
          // position,
          type: "team",
        };
      }
    });
  }

  function populateTeamOptions(phaseItem, phaseId) {
    if (phaseItem.type == "group") {
      // for group, populate teamsPerGroup times
      for (let position = 1; position <= phaseItem.teamsPerGroup; position++) {
        const id = `g-${phaseItem.id}-${position}`;
        teamOptions[id] = {
          name: `${phaseItem.name}, Ranking ${position}`,
          used: false,
          phase: phaseId,
          id,
          itemId: phaseItem.id, //group.id
          position,
          type: "group",
        };
      }
      phaseItem.teams.forEach((team, teamIndex) => {
        populateGroupSelectedOption(team, phaseItem.id, teamIndex + 1); // pos starts from 1
      });
    } else if (phaseItem.type == "single_match") {
      //for match, populate twice
      [1, 2].forEach((position) => {
        const textPrepend = position === 1 ? "Winner" : "Loser";
        const id = `m-${phaseItem.id}-${position}`;
        teamOptions[id] = {
          name: `${textPrepend}, ${phaseItem.name}`,
          used: false,
          phase: phaseId,
          id,
          itemIdd: phaseItem.id,
          position,
          type: "match",
        };
        populateMatchSelectedOption(phaseItem, position);
      });
    }
  }

  function populateGroupSelectedOption(obj, keyId, keyPosition) {
    const team = obj;
    const { id, futureTeamReference: reference } = team;
    // direct team assigned -> if homeTeamId != null && futureTeamReference == null
    if (team.teamId && !reference?.id) {
      selectedTeamOptions[`g-${keyId}-${keyPosition}`] =
        teamOptions[`t-${team.teamId}`];
      (teamOptions[`t-${team.teamId}`] ??= {}).used = true;
      return;
    }

    if (!reference?.id)
      return (selectedTeamOptions[`g-${keyId}-${keyPosition}`] =
        teamOptions["empty"]);

    const { type, id: refId, position } = reference;

    if (type === "group") {
      const foundGroup = groups[refId];
      const foundTeam = foundGroup?.teams.find(
        (t) => t.teamRanking === position
      );
      // future team assigned (rank published) -> if refMatch.homeTeamId != null && futureTeamReference != null
      // future team assigned (rank unpublished) -> if refMatch.homeTeamId == null && futureTeamReference != null
      let rankingPublished = false;
      if (foundGroup.matches?.length) {
        const teamsCount = foundGroup.teamsPerGroup;
        // applying formula
        rankingPublished =
          foundGroup.matches?.length ===
          (foundGroup.doubleRoundRobin
            ? teamsCount ^ (2 - teamsCount)
            : (teamsCount ^ (2 - teamsCount)) / 2);
      }
      if (rankingPublished) {
        (teamOptions[`g-${keyId}-${keyPosition}`] ??= {}).used = true;
        return (selectedTeamOptions[`g-${keyId}-${keyPosition}`] =
          teamOptions[`t-${foundTeam.teamId}`]);
      } else {
        (teamOptions[`g-${foundGroup.id}-${position}`] ??= {}).used = true;
        return (selectedTeamOptions[`g-${keyId}-${keyPosition}`] =
          teamOptions[`g-${foundGroup.id}-${position}`]);
      }
    } else if (type === "match") {
      const foundMatch = matches[refId];
      let val = null;

      // future team assigned (rank published) -> if refMatch.homeTeamId != null && futureTeamReference != null
      // future team assigned (rank unpublished) -> if refMatch.homeTeamId == null && futureTeamReference != null
      const rankingPublished = !!(
        foundMatch.homeTeamId &&
        foundMatch.awayTeamId &&
        refId
      );
      if (rankingPublished) {
        let foundTeamId = null;
        if (
          (position === 1 &&
            foundMatch?.homeTeamScore > foundMatch?.awayTeamScore) ||
          (position === 2 &&
            foundMatch?.homeTeamScore < foundMatch?.awayTeamScore)
        ) {
          // teams[] is obj with key teamId, teamOptions[] obj with key gt.id
          // first retrieve gt.id from teams using teamId, then retrieve teamOptions using gt.id
          foundTeamId = teams[foundMatch?.homeTeamId]?.teamId;
        } else {
          foundTeamId = teams[foundMatch?.awayTeamId]?.teamId;
        }
        val = teamOptions[`t-${foundTeamId}`];
        (teamOptions[`t-${foundTeamId}`] ??= {}).used = true;
        return (selectedTeamOptions[`g-${keyId}-${keyPosition}`] = val);
      } else {
        (teamOptions[`m-${refId}-${position}`] ??= {}).used = true;
        val = teamOptions[`m-${refId}-${position}`];
        return (selectedTeamOptions[`g-${keyId}-${keyPosition}`] = val);
      }
    }
  }

  function populateMatchSelectedOption(match, presentTeamPosition) {
    const { id, futureTeamReference } = match;
    // matchTeamTitles[id] = ["Empty Spot", "Empty Spot"]; // Initialize both home and away slots
    // Direct assignment if team names are present, home pos =1, away pos =2
    if (match.homeTeamId && !futureTeamReference?.home?.id) {
      (teamOptions[`t-${match.homeTeamId}`] ??= {}).used = true;
      selectedTeamOptions[`m-${match.id}-1`] =
        teamOptions[`t-${match.homeTeamId}`];
      if (presentTeamPosition === 1) return;
    }
    if (match.awayTeamId && !futureTeamReference?.away?.id) {
      (teamOptions[`t-${match.awayTeamId}`] ??= {}).used = true;
      selectedTeamOptions[`m-${match.id}-2`] =
        teamOptions[`t-${match.awayTeamId}`];
      if (presentTeamPosition === 2) return;
    }
    // reset both options to empty slot
    selectedTeamOptions[`m-${match.id}-1`] = selectedTeamOptions[
      `m-${match.id}-2`
    ] = teamOptions["empty"];

    // Process both home and away references //todo: loop is doing repetitive task
    Object.entries(futureTeamReference || {}).forEach(
      ([teamType, reference], index) => {
        const keyPosition = teamType === "home" ? 1 : 2;
        if (!reference?.id)
          return (selectedTeamOptions[`m-${match.id}-${keyPosition}`] =
            teamOptions["empty"]);

        //for every match, forEach loop will run twice for teamType-home(pos=1)/teamType-away(pos=2)
        const { type, id: refId, position } = reference;

        if (type === "group") {
          const foundGroup = groups[refId];
          const foundTeam = foundGroup?.teams.find(
            (t) => t.teamRanking === position
          );
          let val = null;
          // future team assigned (rank published) -> if refMatch.homeTeamId != null && futureTeamReference != null
          // future team assigned (rank unpublished) -> if refMatch.homeTeamId == null && futureTeamReference != null
          let rankingPublished = false;
          if (foundGroup.matches?.length) {
            const teamsCount = foundGroup.teamsPerGroup;
            // applying formula
            rankingPublished =
              foundGroup.matches?.length ===
              (foundGroup.doubleRoundRobin
                ? teamsCount ^ (2 - teamsCount)
                : (teamsCount ^ (2 - teamsCount)) / 2);
          }
          if (rankingPublished) {
            (teamOptions[`t-${foundTeam.teamId}`] ??= {}).used = true;
            val = teamOptions[`t-${foundTeam.teamId}`];
          } else {
            (teamOptions[`g-${foundGroup.id}-${position}`] ??= {}).used = true;
            val = teamOptions[`g-${foundGroup.id}-${position}`];
          }
          return (selectedTeamOptions[`m-${match.id}-${keyPosition}`] = val);
        } else if (type === "match") {
          const foundMatch = matches[refId];

          let val = null;
          // future team assigned (rank published) -> if refMatch.homeTeamId != null && futureTeamReference != null
          // future team assigned (rank unpublished) -> if refMatch.homeTeamId == null && futureTeamReference != null
          const rankingPublished = !!(
            foundMatch.homeTeamId &&
            foundMatch.awayTeamId &&
            refId
          );
          if (rankingPublished) {
            let foundTeamId = null;
            if (
              (position === 1 &&
                foundMatch?.homeTeamScore > foundMatch?.awayTeamScore) ||
              (position === 2 &&
                foundMatch?.homeTeamScore < foundMatch?.awayTeamScore)
            ) {
              // teams[] is obj with key teamId, teamOptions[] obj with key gt.id
              // first retrive gt.id from teams using teamId, then retrieve teamOptions using gt.id
              foundTeamId = teams[foundMatch?.homeTeamId]?.teamId;
            } else {
              foundTeamId = teams[foundMatch?.awayTeamId]?.teamId;
            }
            val = teamOptions[`t-${foundTeamId}`];
            (teamOptions[`t-${foundTeamId}`] ??= {}).used = true;
            return (selectedTeamOptions[`m-${match.id}-${keyPosition}`] = val);
          } else {
            (teamOptions[`m-${refId}-${position}`] ??= {}).used = true;
            val = teamOptions[`m-${refId}-${position}`];
            return (selectedTeamOptions[`m-${match.id}-${keyPosition}`] = val);
          }
        }
      }
    );
  }

  // console.log(7, selectedTeamOptions);
  return {
    tournamentFormat: phasesMap,
    participants,
    groups,
    teams,
    matches,
    teamOptions,
    selectedTeamOptions,
    entityCount,
  };
};

const demoData = [
  {
    phaseId: 1,
    phaseName: "Phase 1",
    phaseOrder: 1,
    groupId: 1,
    groupName: "Group A",
    groupOrder: 1,
    doubleRoundRobin: false,
    groupsCount: 2,
    teamsPerGroup: 4,
    groupTeamId: 1,
    teamRanking: 1,
    teamId: 2,
    groupTeamName: "FCB",
    groupFutureTeamReference: null,
    bracketId: null,
    bracketName: null,
    bracketOrder: null,
    teamsCount: null,
    matchId: 1,
    matchName: "Match 1",
    matchType: "group",
    matchOrder: 1,
    matchFutureTeamReference: null,
    roundType: null,
    startTime: "2024-08-19T14:00:00Z",
    homeTeamId: 1,
    awayTeamId: 2,
    homeTeamScore: 3,
    awayTeamScore: 4,
  },
  {
    phaseId: 1,
    phaseName: "Phase 1",
    phaseOrder: 1,
    groupId: 1,
    groupName: "Group A",
    groupOrder: 1,
    doubleRoundRobin: false,
    groupsCount: 2,
    teamsPerGroup: 4,
    groupTeamId: 2,
    teamRanking: 2,
    teamId: 3,
    groupTeamName: "RM",
    groupFutureTeamReference: null,
    bracketId: null,
    bracketName: null,
    bracketOrder: null,
    teamsCount: null,
    matchId: null,
    matchName: null,
    matchType: null,
    matchOrder: null,
    matchFutureTeamReference: null,
    roundType: null,
    startTime: null,
    homeTeamId: null,
    awayTeamId: null,
    homeTeamScore: null,
    awayTeamScore: null,
  },
  {
    phaseId: 1,
    phaseName: "Phase 1",
    phaseOrder: 1,
    groupId: 2,
    groupName: "Group B",
    groupOrder: 1,
    doubleRoundRobin: false,
    groupsCount: 2,
    teamsPerGroup: 4,
    groupTeamId: 3,
    teamRanking: 2,
    teamId: 4,
    groupTeamName: "Atletico",
    groupFutureTeamReference: null,
    bracketId: null,
    bracketName: null,
    bracketOrder: null,
    teamsCount: null,
    matchId: null,
    matchName: null,
    matchType: null,
    matchOrder: null,
    matchFutureTeamReference: null,
    roundType: null,
    startTime: null,
    homeTeamId: null,
    awayTeamId: null,
    homeTeamScore: null,
    awayTeamScore: null,
  },
  {
    phaseId: 1,
    phaseName: "Phase 1",
    phaseOrder: 1,
    groupId: 2,
    groupName: "Group B",
    groupOrder: 1,
    doubleRoundRobin: false,
    groupsCount: 2,
    teamsPerGroup: 4,
    groupTeamId: 4,
    teamRanking: 2,
    teamId: 5,
    groupTeamName: "ManU",
    groupFutureTeamReference: null,
    bracketId: null,
    bracketName: null,
    bracketOrder: null,
    teamsCount: null,
    matchId: null,
    matchName: null,
    matchType: null,
    matchOrder: null,
    matchFutureTeamReference: null,
    roundType: null,
    startTime: null,
    homeTeamId: null,
    awayTeamId: null,
    homeTeamScore: null,
    awayTeamScore: null,
  },
  {
    phaseId: 2,
    phaseName: "Phase 2",
    phaseOrder: 2,
    groupId: null,
    groupName: null,
    groupOrder: null,
    doubleRoundRobin: null,
    groupsCount: null,
    teamsPerGroup: null,
    groupTeamId: null,
    teamRanking: null,
    teamId: null,
    groupTeamName: null,
    groupFutureTeamReference: null,
    bracketId: 1,
    bracketName: "Bracket 1",
    bracketOrder: 1,
    teamsCount: 4,
    matchId: 1,
    matchName: "Match 1",
    matchType: "bracket",
    matchOrder: 1,
    matchFutureTeamReference: null,
    roundType: 1,
    startTime: "2024-08-19T14:00:00Z",
    homeTeamId: 2,
    awayTeamId: 4,
    homeTeamScore: 2,
    awayTeamScore: 1,
  },
  {
    phaseId: 2,
    phaseName: "Phase 2",
    phaseOrder: 2,
    groupId: null,
    groupName: null,
    groupOrder: null,
    doubleRoundRobin: null,
    groupsCount: null,
    teamsPerGroup: null,
    groupTeamId: null,
    teamRanking: null,
    teamId: null,
    groupTeamName: null,
    groupFutureTeamReference: null,
    bracketId: 1,
    bracketName: "Bracket 1",
    bracketOrder: 1,
    teamsCount: 4,
    matchId: 2,
    matchName: "Match 2",
    matchType: "bracket",
    matchOrder: 2,
    matchFutureTeamReference: null,
    roundType: 1,
    startTime: "2024-08-19T14:00:00Z",
    homeTeamId: 3,
    awayTeamId: 5,
    homeTeamScore: 1,
    awayTeamScore: 2,
  },
  {
    phaseId: 2,
    phaseName: "Phase 2",
    phaseOrder: 2,
    groupId: null,
    groupName: null,
    groupOrder: null,
    doubleRoundRobin: null,
    groupsCount: null,
    teamsPerGroup: null,
    groupTeamId: null,
    teamRanking: null,
    teamId: null,
    groupTeamName: null,
    groupFutureTeamReference: null,
    bracketId: 1,
    bracketName: "Bracket 1",
    bracketOrder: 1,
    teamsCount: 4,
    matchId: 3,
    matchName: "Match 3",
    matchType: "bracket",
    matchOrder: 1,
    matchFutureTeamReference: null,
    roundType: 0,
    startTime: "2024-08-19T14:00:00Z",
    homeTeamId: 2,
    awayTeamId: 3,
    homeTeamScore: 2,
    awayTeamScore: 1,
  },
  {
    phaseId: 2,
    phaseName: "Phase 2",
    phaseOrder: 2,
    groupId: null,
    groupName: null,
    groupOrder: null,
    doubleRoundRobin: null,
    groupsCount: null,
    teamsPerGroup: null,
    groupTeamId: null,
    teamRanking: null,
    teamId: null,
    groupTeamName: null,
    groupFutureTeamReference: null,
    bracketId: null,
    bracketName: null,
    bracketOrder: null,
    teamsCount: null,
    matchId: 4,
    matchName: "Match 4",
    matchType: "single_match",
    matchOrder: 1,
    matchFutureTeamReference: {
      home: { type: "match", id: 1, position: 2 },
      away: { type: "match", id: 2, position: 2 },
    },
    roundType: 0,
    startTime: "2024-08-19T14:00:00Z",
    homeTeamId: null,
    awayTeamId: null,
    homeTeamScore: null,
    awayTeamScore: null,
  },
];
