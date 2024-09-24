const { sql } = require("../db");
const tournamentService = require("../service/tournament");

exports.saveGroupTeam = async ({ payload: { updateGroupTeam } }) => {
  const [savedGroupTeam] = await sql`
        insert into groups_teams ${sql(updateGroupTeam)} on conflict (id)
        do
        update set ${sql(updateGroupTeam)}
            returning *`;
  return savedGroupTeam;
};

exports.savePhase = async ({ payload: { newPhase, tournamentId } }) => {
  const [savedPhase] = await sql`
        insert into tournament_phases ${sql(newPhase)} on conflict (id)
        do
        update set ${sql(newPhase)}
            returning *`;

  if (savedPhase.id) {
    await sql`UPDATE tournaments
                  SET entity_last_count = entity_last_count || jsonb_object(
                          ARRAY['phase'],
                          ARRAY[((entity_last_count ->> 'phase')::int + 1)::text])
                  WHERE id = ${tournamentId};`;
  }
  return savedPhase;
};

exports.saveGroup = async ({ payload: { newGroup, match, tournamentId } }) => {
  const [savedGroup] = await sql`
        insert into tournament_groups ${sql(newGroup)} on conflict (id)
        do
        update set ${sql(newGroup)}
            returning *`;

  // add in groups_teams null teamid items for payload.teamsPerGroup times
  const groupsTeams = [];

  const groupTeam = {
    teamRanking: null,
    futureTeamReference: null,
    tournamentGroupId: null,
    teamId: null,
  };

  for (let i = 1; i <= savedGroup.teamsPerGroup; i++) {
    groupTeam.teamRanking = i;
    groupTeam.tournamentGroupId = savedGroup.id;

    groupsTeams.push({ ...groupTeam });
  }
  const groupMatches = [];
  const groupMatch = {
    name: null,
    order: null,
    type: "group",
    futureTeamReference: null,
    roundType: null,
    startTime: null,
    homeTeamId: null,
    awayTeamId: null,
    groupId: savedGroup.id,
  };

  const matchCount =
    (savedGroup.teamsPerGroup * savedGroup.teamsPerGroup -
      savedGroup.teamsPerGroup) /
    2;
  const totalMatchCount = savedGroup.doubleRoundRobin
    ? matchCount * 2
    : matchCount;

  for (let i = 1; i <= totalMatchCount; i++) {
    groupMatch.name = `Match ${match.count++}`;
    groupMatch.order = i;

    groupMatches.push({ ...groupMatch });
  }

  const savedGroupsTeams = await sql`
        insert into groups_teams ${sql(groupsTeams)} returning *`;

  const savedGroupsMatches = await sql`
        insert into matches ${sql(groupMatches)} returning *`;

  // only apply when adding
  if (!newGroup.id && savedGroupsTeams.length && savedGroupsMatches.length) {
    await sql`
            UPDATE tournaments
            SET entity_last_count = entity_last_count || jsonb_object(
                    ARRAY['group', 'match'],
                    ARRAY[((entity_last_count ->> 'group')::int + 1)::text, 
                                 ((entity_last_count ->> 'match')::int + ${savedGroupsMatches.length})::text])
            WHERE id = ${tournamentId};`;
  }
  return {
    ...savedGroup,
    teams: savedGroupsTeams,
    matches: savedGroupsMatches,
  };
};

exports.saveMatch = async ({
  payload: { newMatch, tournamentId },
  updateCount = true,
}) => {
  const [savedMatch] = await sql`
        insert into matches ${sql(newMatch)} on conflict (id)
        do
        update set ${sql(newMatch)}
            returning *`;

  // only apply when adding
  if (!newMatch.id && savedMatch.id && updateCount) {
    await sql`UPDATE tournaments
                  SET entity_last_count = entity_last_count || jsonb_object(
                          ARRAY['match'],
                          ARRAY[((entity_last_count ->> 'match')::int + 1)::text])
                  WHERE id = ${tournamentId};`;
  }
  return savedMatch;
};

exports.resetEntityLastCount = async ({
  isPhaseEmpty,
  isPhaseItemsEmpty,
  tournamentId,
}) => {
  if (isPhaseItemsEmpty && isPhaseItemsEmpty === "true") {
    const [updatedTournament] = await sql`
            UPDATE tournaments
            SET entity_last_count = entity_last_count || jsonb_object(
                    ARRAY['group', 'bracket', 'match'],
                    ARRAY[1::text, 1::text, 1::text])
            WHERE id = ${tournamentId} returning *;`;
    return updatedTournament.entityLastCount;
  } else if (isPhaseEmpty && isPhaseEmpty === "true") {
    const [updatedTournament] = await sql`
            UPDATE tournaments
            SET entity_last_count = entity_last_count || jsonb_object(
                    ARRAY['phase', 'group', 'bracket', 'match'],
                    ARRAY[1::text, 1::text, 1::text, 1::text])
            WHERE id = ${tournamentId} returning *;`;
    return updatedTournament.entityLastCount;
  }
};

exports.removePhase = async ({
  phaseId,
  tournamentId,
  isPhaseEmpty,
  organizerId,
}) => {
  const [deletedPhase] = await sql`
        delete
        from tournament_phases
        where id = ${phaseId} returning *`;

  const entityLastCount = await exports.resetEntityLastCount({
    isPhaseEmpty,
    tournamentId,
  });
  return { deletedPhase, entityLastCount };
};

exports.removeGroup = async ({
  groupId,
  tournamentId,
  isPhaseItemsEmpty,
  organizerId,
}) => {
  const [deletedGroup] = await sql`
        delete
        from tournament_groups
        where id = ${groupId} returning *`;

  const entityLastCount = await exports.resetEntityLastCount({
    isPhaseItemsEmpty,
    tournamentId,
  });
  return { deletedGroup, entityLastCount };
};

exports.removeBracket = async ({
  bracketId,
  tournamentId,
  isPhaseItemsEmpty,
  organizerId,
}) => {
  const [deletedBracket] = await sql`
        delete
        from tournament_brackets
        where id = ${bracketId} returning *`;

  const entityLastCount = await exports.resetEntityLastCount({
    isPhaseItemsEmpty,
    tournamentId,
  });
  return { deletedBracket, entityLastCount };
};

exports.removeMatch = async ({
  matchId,
  tournamentId,
  isPhaseItemsEmpty,
  organizerId,
}) => {
  const [deletedMatch] = await sql`
        delete
        from matches
        where id = ${matchId} returning *`;
  const entityLastCount = await exports.resetEntityLastCount({
    isPhaseItemsEmpty,
    tournamentId,
  });
  return { deletedMatch, entityLastCount };
};

exports.saveBracket = async ({
  payload: { newBracket, match, tournamentId },
}) => {
  match.count = Number(match.count);
  const [savedBracket] = await sql`
        insert into tournament_brackets ${sql(newBracket)} on conflict (id)
        do
        update set ${sql(newBracket)}
            returning *`;

  const returnedBracket = {
    id: savedBracket.id,
    type: "bracket",
    name: savedBracket.name,
    order: savedBracket.order,
    teamsCount: savedBracket.teamsCount,
    tournamentPhaseId: savedBracket.tournamentPhaseId,
    rounds: [],
  };
  // teamsCount 64 -> round 6 -> matchCount 32 -> round of 64
  // teamsCount 32 -> round 5 -> matchCount 16 -> round of 32
  // teamsCount 16 -> round 4 -> matchCount 8 -> round of 16
  // teamsCount 8 -> round 3 -> matchCount 4 -> quarter-finals
  // teamsCount 4 -> round 2 -> matchCount 2 -> semi-finals
  // teamsCount 2 -> round 1 -> matchCount 1 -> final
  // round -> log2(teamsCount) -> log2(8) = 3
  // matchCount -> teamsCount/2 -> 8/2 = 4

  let totalMatchCount = 0;
  let maxTeamCount = savedBracket.teamsCount;
  let maxRoundCount = Math.round(Math.log2(maxTeamCount));
  let targetRoundIndex = -1; //one round behind
  // round iteration simulation
  // [roundType 2 - roundIndex 0]
  // [roundType 1- roundIndex 1]
  // [roundType 0 - roundIndex 2]

  //
  //
  //
  for (
    let currRoundCount = maxRoundCount;
    currRoundCount > 0;
    currRoundCount--
  ) {
    const newRound = { type: currRoundCount, matches: [] };
    let maxMatchCount = maxTeamCount / 2;
    let targetMatchIndex = 0;
    //
    for (
      let currMatchCount = 0;
      currMatchCount < maxMatchCount;
      currMatchCount++
    ) {
      // create match
      const newMatch = {
        name: `Match ${match.count++}`,
        order: currMatchCount,
        type: "bracket",
        roundType: currRoundCount,
        startTime: null,
        homeTeamId: null,
        awayTeamId: null,
        bracketId: savedBracket.id,
        phaseId: returnedBracket.tournamentPhaseId,
      };
      //
      if (currRoundCount !== maxRoundCount) {
        //currRoundCount + 1 as reverse loop
        const refId =
          returnedBracket.rounds[targetRoundIndex].matches[targetMatchIndex++]
            .id;
        newMatch.futureTeamReference = {
          home: { type: "match", id: refId, position: 1 },
          away: { type: "match", id: refId + 1, position: 1 }, //eg, final match away team from next match
        };
      } else {
        newMatch.futureTeamReference = null;
      }

      const savedMatch = await exports.saveMatch({
        payload: { newMatch, tournamentId },
        updateCount: false,
      });

      if (savedMatch.id) totalMatchCount++;

      newRound.matches.push({
        id: savedMatch.id,
        name: savedMatch.name,
        type: "bracket",
        order: currMatchCount,
        startTime: null,
        homeTeamId: null,
        awayTeamId: null,
        homeTeamScore: null,
        awayTeamScore: null,
        futureTeamReference: savedMatch.futureTeamReference,
        rankingPublished: false,
        bracketId: savedBracket.id,
        phaseId: returnedBracket.tournamentPhaseId,
      });
    }
    targetRoundIndex++;
    maxTeamCount = maxTeamCount / 2;
    returnedBracket.rounds.push(newRound);
  }

  // only apply when adding
  if (!newBracket.id)
    await sql`
            UPDATE tournaments
            SET entity_last_count = entity_last_count || jsonb_object(
                    ARRAY['bracket', 'match'],
                    ARRAY[((entity_last_count ->> 'bracket')::int + 1)::text, 
                                 ((entity_last_count ->> 'match')::int + ${totalMatchCount})::text])
            WHERE id = ${tournamentId};`;

  return returnedBracket;
};

exports.createGroupPhase = async ({
  payload: {
    tournamentBaseFormat: { groupCount, groupMemberCount },
    entityLastCount,
    tournamentId,
  },
  organizerId,
}) => {
  // create phase
  const newPhase = {
    name: `Phase ${entityLastCount.phase++}`,
    order: 1,
    tournamentId: tournamentId,
  };
  const savedPhase = await exports.savePhase({
    payload: { newPhase, tournamentId },
  });
  savedPhase.items = [];

  // create groups
  for (let i = 1; i <= groupCount; i++) {
    const newGroup = {
      name: `Group ${entityLastCount.group++}`,
      teamsPerGroup: groupMemberCount,
      doubleRoundRobin: false,
      order: i,
      tournamentPhaseId: savedPhase.id,
    };
    const savedGroup = await exports.saveGroup({
      payload: {
        newGroup,
        match: { count: entityLastCount.match },
        tournamentId,
      },
    });
    savedGroup.type = "group";
    entityLastCount.match =
      Number(entityLastCount.match) + Number(savedGroup.matches.length);
    savedPhase.items.push(savedGroup);
  }
  // generate teamOptions & selectedTeamOptions
  const participants = await tournamentService.getParticipants({
    tournamentId,
    organizerId,
  });
  let teamOptions = populateTeamOptionsWParticipants({
    teamOptions: {},
    participants,
  });
  const { teams, groups, matches } = populateTeamGroupMatch({
    phaseMap: [savedPhase],
  });
  const { teamOptions: updatedTeamOptions, selectedTeamOptions } =
    populateSelectedNTeamOptions({
      phaseMap: [savedPhase],
      teamOptions,
      selectedTeamOptions: {},
      teams,
      groups,
      matches,
    });
  teamOptions = { ...teamOptions, ...updatedTeamOptions };
  return {
    tournamentFormat: [savedPhase],
    participants,
    teamOptions,
    selectedTeamOptions,
    entityLastCount,
  };
};

exports.createGroupKnockoutPhase = async ({ payload, organizerId }) => {
  const savedGroupPhase = await exports.createGroupPhase({
    payload,
    organizerId,
  });
  const savedKnockoutPhase = await exports.createKnockoutPhase({
    payload,
    organizerId,
    phaseOrder: 2,
  });

  const {
    tournamentFormat: tournamentFormatG,
    participants: participantsG,
    teamOptions: teamOptionsG,
    selectedTeamOptions: selectedTeamOptionsG,
    entityLastCount: entityLastCountG,
  } = savedGroupPhase;

  const {
    tournamentFormat: tournamentFormatK,
    participants: participantsK,
    teamOptions: teamOptionsK,
    selectedTeamOptions: selectedTeamOptionsK,
    entityLastCount: entityLastCountK,
  } = savedKnockoutPhase;

  const entityLastCount = Object.entries(entityLastCountG).reduce(
    (acc, [key, val]) => {
      acc[key] = Math.max(Number(val), Number(entityLastCountK[key]));
      return acc;
    },
    {},
  );

  return {
    tournamentFormat: [...tournamentFormatG, ...tournamentFormatK],
    participants: participantsK,
    teamOptions: { ...teamOptionsG, ...teamOptionsK },
    selectedTeamOptions: { ...selectedTeamOptionsG, ...selectedTeamOptionsK },
    entityLastCount,
  };
};

exports.createKnockoutPhase = async ({
  payload: {
    tournamentBaseFormat: { knockoutMemberCount },
    entityLastCount,
    tournamentId,
  },
  organizerId,
  phaseOrder = 1,
}) => {
  // create phase
  const newPhase = {
    name: `Phase ${entityLastCount.phase++}`,
    order: phaseOrder,
    tournamentId: tournamentId,
  };
  const savedPhase = await exports.savePhase({
    payload: { newPhase, tournamentId },
  });
  savedPhase.items = [];

  // create bracket
  const newBracket = {
    name: `Bracket ${entityLastCount.bracket++}`,
    order: 1,
    teamsCount: knockoutMemberCount,
    tournamentPhaseId: savedPhase.id,
  };
  const savedBracket = await exports.saveBracket({
    payload: {
      newBracket,
      match: { count: entityLastCount.match },
      tournamentId,
    },
  });
  entityLastCount.match =
    Number(entityLastCount.match) + (Number(knockoutMemberCount) - 1);
  savedPhase.items.push(savedBracket);

  // generate teamOptions & selectedTeamOptions
  const participants = await tournamentService.getParticipants({
    tournamentId,
    organizerId,
  });
  let teamOptions = populateTeamOptionsWParticipants({
    teamOptions: {},
    participants,
  });
  const { teams, groups, matches } = populateTeamGroupMatch({
    phaseMap: [savedPhase],
  });
  const { teamOptions: updatedTeamOptions, selectedTeamOptions } =
    populateSelectedNTeamOptions({
      phaseMap: [savedPhase],
      teamOptions,
      selectedTeamOptions: {},
      teams,
      groups,
      matches,
    });
  teamOptions = { ...teamOptions, ...updatedTeamOptions };
  return {
    tournamentFormat: [savedPhase],
    participants,
    teamOptions,
    selectedTeamOptions,
    entityLastCount,
  };
};

exports.getTournamentFormat = async ({ tournamentId, organizerId }) => {
  const tournament = await tournamentService.getTournament({ tournamentId });

  let result = await sql`
        SELECT DISTINCT tp.id                   AS phase_id,
                        tp.name                 AS phase_name,
                        tp.order                AS phase_order,
                        CASE
                            WHEN m.type = 'group' THEN tg.id
                            END                 AS group_id,
                        CASE
                            WHEN m.type = 'group' THEN tg.name
                            END                 AS group_name,
                        CASE
                            WHEN m.type = 'group' THEN tg.order
                            END                 AS group_order,
                        CASE
                            WHEN m.type = 'group' THEN tg.double_round_robin
                            END                 AS double_round_robin,
                        CASE
                            WHEN m.type = 'group' THEN tg.teams_per_group
                            END                 AS teams_per_group,
                        CASE
                            WHEN m.type = 'group' THEN gt.id
                            END                 AS group_team_id,
                        CASE
                            WHEN m.type = 'group' THEN gt.team_ranking
                            END                 AS team_ranking,
                        CASE
                            WHEN m.type = 'group' THEN gt.team_id
                            END                 AS team_id,
                        CASE
                            WHEN m.type = 'group' THEN t1.name
                            END                 AS group_team_name, -- Group team name
                        CASE
                            WHEN m.type = 'group' THEN gt.future_team_reference
                            END                 AS group_future_team_reference,
                        CASE
                            WHEN m.type = 'bracket' THEN tb.id
                            END                 AS bracket_id,
                        CASE
                            WHEN m.type = 'bracket' THEN tb.name
                            END                 AS bracket_name,
                        CASE
                            WHEN m.type = 'bracket' THEN tb.order
                            END                 AS bracket_order,
                        CASE
                            WHEN m.type = 'bracket' THEN tb.teams_count
                            END                 AS teams_count,
                        m.id                    AS match_id,
                        m.name                  AS match_name,
                        m.type                  AS match_type,
                        m.order                 AS match_order,
                        m.future_team_reference AS match_future_team_reference,
                        m.round_type,
                        m.start_time,
                        m.home_team_id,
                        m.away_team_id,
                        mr.home_team_score,
                        mr.away_team_score
        FROM tournament_phases tp
                 LEFT JOIN tournament_groups tg
                           ON tg.tournament_phase_id = tp.id
                 LEFT JOIN groups_teams gt ON gt.tournament_group_id = tg.id
                 LEFT JOIN teams t1 ON t1.id = gt.team_id -- Join for group team name
                 LEFT JOIN tournament_brackets tb ON tb.tournament_phase_id = tp.id
                 LEFT JOIN matches m
                           ON (CASE
                                   WHEN m.type = 'group' THEN m.group_id = tg.id
                                   WHEN m.type = 'bracket' THEN m.bracket_id = tb.id
                                   WHEN m.type = 'single_match' THEN m.phase_id = tp.id
                               END)
                 LEFT JOIN match_results mr ON mr.match_id = m.id
        WHERE tp.tournament_id = ${tournamentId};
    `;

  return processTournamentData({
    rawData: result,
    entityLastCount: tournament.entityLastCount,
    tournamentId,
    organizerId,
  });
};

const processTournamentData = async ({
  rawData,
  entityLastCount,
  tournamentId,
  organizerId,
}) => {
  //
  let phaseMap = new Map();
  const participants = await tournamentService.getParticipants({
    tournamentId,
    organizerId,
  });
  let groups = {};
  let teams = {};
  let groupTeams = {};
  let matches = {};
  const teamOptions = {};
  const selectedTeamOptions = {};

  rawData.forEach((row) => {
    // Get or create the phase
    if (!phaseMap.has(row.phaseId)) {
      phaseMap.set(row.phaseId, {
        id: row.phaseId,
        name: row.phaseName,
        order: row.phaseOrder,
        items: [],
      });
    }
    const phase = phaseMap.get(row.phaseId);

    // Process group data if available
    if (row.groupId) {
      let group = phase.items.find(
        (item) => item.type === "group" && item.id === row.groupId,
      );
      if (!group) {
        group = {
          id: row.groupId,
          type: "group",
          name: row.groupName,
          order: row.groupOrder,
          doubleRoundRobin: row.doubleRoundRobin,
          teamsPerGroup: row.teamsPerGroup,
          teams: [], // Initialize an empty array for teams
          matches: [],
        };
        phase.items.push(group);
      }
      if (row.groupTeamId) {
        const teamExists = group.teams.some(
          (team) => team.id === row.groupTeamId,
        );

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
      // // :todo make groupTeam objects
      // if (row.groupTeamId) {
      //   groupTeams[row.groupTeamId] = {
      //     id: row.groupTeamId,
      //     teamRanking: row.teamRanking,
      //     teamId: row.teamId,
      //     tournamentGroupId: row.tournamentGroupId,
      //     futureTeamReference: row.groupFutureTeamReference,
      //   };
      // }
      if (row.matchId) {
        const matchExists = group.matches.some(
          (match) => match.id === row.matchId,
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
        (item) => item.type === "bracket" && item.id === row.bracketId,
      );
      if (!bracket) {
        bracket = {
          id: row.bracketId,
          type: row.matchType,
          name: row.bracketName,
          order: row.bracketOrder,
          teamsCount: row.teamsCount,
          rounds: {}, // Initialized as obj which later converted to array
        };
        phase.items.push(bracket);
      }

      // Add round data to the bracket
      if (row.matchId) {
        //

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
  phaseMap = Array.from(phaseMap.values())
    .sort((a, b) => a.order - b.order)
    .map((phase) => {
      // Sort items by their order
      phase.items.sort((a, b) => a.order - b.order);
      phase.items.forEach((item) => {
        // Sort group teams by ranking
        if (item.type === "group") {
          item.teams.length &&
            item.teams.sort((a, b) => a.teamRanking - b.teamRanking);
        }
        // Sort rounds and matches within brackets
        if (item.type === "bracket") {
          // convert rounds from obj to arr
          item.rounds = Object.values(item.rounds).sort(
            (a, b) => b.type - a.type,
          );
          item.rounds.forEach((round) => {
            round.matches.sort((a, b) => a.order - b.order);
          });
        }
      });
      return phase;
    });

  Object.assign(
    teamOptions,
    populateTeamOptionsWParticipants({ teamOptions, participants }),
  );

  if (!phaseMap.length) {
    if (!participants.length) return { entityLastCount, teamOptions };
    return {
      participants,
      entityLastCount,
      teamOptions,
    };
  }
  // populate groups/teams/matches
  // set phaseItem -> rankingPublished
  ({ phaseMap, teams, groups, matches } = populateTeamGroupMatch({
    phaseMap,
  }));

  // populate teamOptions & selectedTeamOptions
  const {
    teamOptions: updatedTeamOptions,
    selectedTeamOptions: updatedSelectedTeamOptions,
  } = populateSelectedNTeamOptions({
    phaseMap,
    teamOptions,
    selectedTeamOptions,
    teams,
    groups,
    matches,
  });
  Object.assign(teamOptions, updatedTeamOptions);
  Object.assign(selectedTeamOptions, updatedSelectedTeamOptions);

  return {
    tournamentFormat: phaseMap,
    participants,
    teamOptions,
    selectedTeamOptions,
    entityLastCount,
  };
};

const populateTeamOptionsWParticipants = ({ teamOptions, participants }) => {
  teamOptions["empty"] = {
    name: `Empty Slot`,
    used: false,
    phase: 0,
    id: "empty",
  };

  participants.forEach((team, teamIndex) => {
    // for team type only input valid team with id
    if (team.teamId) {
      const id = `t-${team.teamId}`;
      teamOptions[id] = {
        name: team.name,
        used: false,
        phase: 0, // all teams phase is 0 as visible in phase 1 dropdown options
        id,
        itemId: team.teamId, //todo:changed
        // position,
        type: "team",
      };
    }
  });
  return teamOptions;
};

const populateTeamGroupMatch = ({ phaseMap }) => {
  let teams = {},
    groups = {},
    matches = {};
  const updatedPhaseMap = phaseMap.map((phase) => ({
    ...phase,
    items: phase.items.map((phaseItem) => {
      if (phaseItem.type === "group") {
        phaseItem.rankingPublished = phaseItem.matches.some(
          (match) =>
            match?.homeTeamScore != null && match?.awayTeamScore != null,
        );
        groups[phaseItem.id] ??= phaseItem;
        phaseItem.teams?.forEach((team) => {
          teams[team.id] ??= team;
        });
      } else if (phaseItem.type === "single_match") {
        phaseItem.rankingPublished =
          phaseItem?.homeTeamScore != null && phaseItem?.awayTeamScore != null;
        matches[phaseItem.id] ??= phaseItem;
      } else if (phaseItem.type === "bracket") {
        phaseItem.rounds?.forEach((round) => {
          round.matches.forEach((match) => {
            match.rankingPublished =
              match?.homeTeamScore != null && match?.awayTeamScore != null;
            matches[match.id] ??= match;
          });
        });
      }
      return phaseItem;
    }),
  }));
  return {
    phaseMap: updatedPhaseMap,
    teams,
    groups,
    matches,
  };
};

const populateSelectedNTeamOptions = ({
  phaseMap,
  teamOptions,
  selectedTeamOptions,
  teams,
  groups,
  matches,
}) => {
  phaseMap.forEach((phase) => {
    phase.items.forEach((phaseItem, phaseIndex) => {
      if (phaseItem.type === "group") {
        populateTeamOptions({
          phaseItem,
          phaseId: phase.id,
        });
      } else if (phaseItem.type === "single_match") {
        populateTeamOptions({
          phaseItem,
          phaseId: phase.id,
        });
      } else if (phaseItem.type === "bracket") {
        if (phaseItem.rounds?.length) {
          phaseItem.rounds.forEach((round) => {
            round.matches.forEach((match) => {
              match.type = "single_match";
              populateTeamOptions({
                phaseItem: match,
                phaseId: phase.id,
              });
            });
          });
        }
      }
    });
  });
  return {
    teamOptions,
    selectedTeamOptions,
  };

  function populateTeamOptions({ phaseItem, phaseId }) {
    if (phaseItem.type === "group") {
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
        populateGroupSelectedOption({
          teams: phaseItem.teams,
          keyId: phaseItem.id,
          keyPosition: position,
          // keyPosition: phaseItem.teams?.[position - 1]?.teamRanking || position,
        });
      }
      // phaseItem.teams.forEach((team, teamIndex) => {
      //   populateGroupSelectedOption(team, phaseItem.id, teamIndex + 1); // pos starts from 1
      // });
    } else if (phaseItem.type === "single_match") {
      //for match, populate twice
      [1, 2].forEach((position) => {
        const textPrepend = position === 1 ? "Winner" : "Loser";
        const id = `m-${phaseItem.id}-${position}`;
        teamOptions[id] = {
          name: `${textPrepend}, ${phaseItem.name}`,
          used: false,
          phase: phaseId,
          id,
          itemId: phaseItem.id,
          position,
          type: "match",
        };
        populateMatchSelectedOption({
          phaseItem,
          presentTeamPosition: position,
        });
      });
    }
  }

  function populateGroupSelectedOption({ teams, keyId, keyPosition }) {
    const team = Object.values(teams).find(
      (item) => item.teamRanking === keyPosition,
    );
    const { id, futureTeamReference: reference } = team || {};

    //hostTeam gt.id
    const hostGroupTeamId = groups[keyId]?.teams.find(
      (t) => t.teamRanking === keyPosition,
    )?.id;

    // direct team assigned -> if teamId != null && futureTeamReference == null
    if (team?.teamId && !reference?.id) {
      selectedTeamOptions[`g-${keyId}-${keyPosition}`] = {
        ...teamOptions[`t-${team.teamId}`],
        groupTeamId: hostGroupTeamId,
      };
      (teamOptions[`t-${team.teamId}`] ??= {}).used = true;
      return;
    }

    if (!reference?.id) {
      return (selectedTeamOptions[`g-${keyId}-${keyPosition}`] = {
        ...teamOptions["empty"],
        groupTeamId: hostGroupTeamId,
      });
    }

    const { type, id: refId, position } = reference;

    if (type === "group") {
      const foundGroup = groups[refId];
      const foundTeam = foundGroup?.teams.find(
        (t) => t.teamRanking === position,
      );
      // future team assigned (rank published) -> if foundGroup.rankingPublished && futureTeamReference != null
      // future team assigned (rank unpublished) -> if !foundGroup.rankingPublished && futureTeamReference != null

      if (foundGroup?.rankingPublished === true) {
        (teamOptions[`g-${keyId}-${keyPosition}`] ??= {}).used = true;
        return (selectedTeamOptions[`g-${keyId}-${keyPosition}`] = {
          ...teamOptions[`t-${foundTeam.teamId}`],
          groupTeamId: hostGroupTeamId,
        });
      } else if (foundGroup?.rankingPublished === false) {
        (teamOptions[`g-${foundGroup.id}-${position}`] ??= {}).used = true;
        return (selectedTeamOptions[`g-${keyId}-${keyPosition}`] = {
          ...teamOptions[`g-${foundGroup.id}-${position}`],
          groupTeamId: hostGroupTeamId,
        });
      }
    } else if (type === "match") {
      const foundMatch = matches[refId];
      let val = null;

      // future team assigned (rank published) -> if refMatch.homeTeamId != null && futureTeamReference != null
      // future team assigned (rank unpublished) -> if refMatch.homeTeamId == null && futureTeamReference != null
      if (foundMatch?.rankingPublished === true) {
        let foundTeamId = null;
        if (
          (position === 1 &&
            foundMatch?.homeTeamScore > foundMatch?.awayTeamScore) ||
          (position === 2 &&
            foundMatch?.homeTeamScore < foundMatch?.awayTeamScore)
        ) {
          // teams[] is obj with key teamId, teamOptions[] obj with key gt.id
          // first retrieve gt.id from teams using teamId, then retrieve teamOptions using gt.id
          foundTeamId = Object.values(teams).find(
            (team) => team.teamId === foundMatch?.homeTeamId,
          )?.teamId;
        } else {
          foundTeamId = Object.values(teams).find(
            (team) => team.teamId === foundMatch?.awayTeamId,
          )?.teamId;
        }
        (teamOptions[`t-${foundTeamId}`] ??= {}).used = true;

        return (selectedTeamOptions[`g-${keyId}-${keyPosition}`] = {
          ...teamOptions[`t-${foundTeamId}`],
          groupTeamId: hostGroupTeamId,
        });
      } else if (foundMatch?.rankingPublished === false) {
        (teamOptions[`m-${refId}-${position}`] ??= {}).used = true;

        return (selectedTeamOptions[`g-${keyId}-${keyPosition}`] = {
          ...teamOptions[`m-${refId}-${position}`],
          groupTeamId: hostGroupTeamId,
        });
      }
    }
  }

  function populateMatchSelectedOption({
    phaseItem: match,
    presentTeamPosition,
  }) {
    const { id, futureTeamReference } = match;
    // matchTeamTitles[id] = ["Empty Spot", "Empty Spot"]; // Initialize both home and away slots
    // Direct assignment if team names are present, home pos =1, away pos =2

    if (
      match.homeTeamId &&
      !futureTeamReference?.home?.id &&
      presentTeamPosition === 1
    ) {
      (teamOptions[`t-${match.homeTeamId}`] ??= {}).used = true;
      return (selectedTeamOptions[`m-${match.id}-${presentTeamPosition}`] =
        teamOptions[`t-${match.homeTeamId}`]);
    }
    if (
      match.awayTeamId &&
      !futureTeamReference?.away?.id &&
      presentTeamPosition === 2
    ) {
      (teamOptions[`t-${match.awayTeamId}`] ??= {}).used = true;
      return (selectedTeamOptions[`m-${match.id}-${presentTeamPosition}`] =
        teamOptions[`t-${match.awayTeamId}`]);
    }

    // Process both home and away references //todo: loop is doing repetitive task
    const reference =
      presentTeamPosition === 1
        ? futureTeamReference?.home
        : presentTeamPosition === 2
          ? futureTeamReference?.away
          : {};

    if (!reference?.id) {
      return selectedTeamOptions[`m-${match.id}-${presentTeamPosition}`] =
        teamOptions["empty"];
    }
    //for every match, forEach loop will run twice for teamType-home(pos=1)/teamType-away(pos=2)
    const { type, id: refId, position } = reference;

    if (type === "group") {
      const foundGroup = groups[refId];
      const foundTeam = foundGroup?.teams.find(
        (t) => t.teamRanking === position,
      );
      let val = null;

      if (foundGroup?.rankingPublished === true) {
        (teamOptions[`t-${foundTeam.teamId}`] ??= {}).used = true;
        val = teamOptions[`t-${foundTeam.teamId}`];
      } else if (foundGroup?.rankingPublished === false) {
        (teamOptions[`g-${foundGroup.id}-${position}`] ??= {}).used = true;
        val = teamOptions[`g-${foundGroup.id}-${position}`];
      }
      return (selectedTeamOptions[`m-${match.id}-${presentTeamPosition}`] =
        val);
    } else if (type === "match") {
      const foundMatch = matches[refId];

      let val = null;

      if (foundMatch?.rankingPublished === true) {
        let foundTeamId = null;
        if (
          (position === 1 &&
            foundMatch?.homeTeamScore > foundMatch?.awayTeamScore) ||
          (position === 2 &&
            foundMatch?.homeTeamScore < foundMatch?.awayTeamScore)
        ) {
          // teams[] is obj with key teamId, teamOptions[] obj with key gt.id
          // first retrive gt.id from teams using teamId, then retrieve teamOptions using gt.id
          foundTeamId = Object.values(teams).find(
            (team) => team.teamId === foundMatch?.homeTeamId,
          )?.teamId;
        } else {
          foundTeamId = Object.values(teams).find(
            (team) => team.teamId === foundMatch?.awayTeamId,
          )?.teamId;
        }
        val = teamOptions[`t-${foundTeamId}`];
        (teamOptions[`t-${foundTeamId}`] ??= {}).used = true;
        return (selectedTeamOptions[`m-${match.id}-${presentTeamPosition}`] =
          val);
      } else if (foundMatch?.rankingPublished === false) {
        (teamOptions[`m-${refId}-${position}`] ??= {}).used = true;
        val = teamOptions[`m-${refId}-${position}`];
        return (selectedTeamOptions[`m-${match.id}-${presentTeamPosition}`] =
          val);
      }
    }
  }
};
