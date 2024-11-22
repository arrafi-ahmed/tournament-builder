const { sql } = require("../db");
const tournamentService = require("../service/tournament");
const teamService = require("./team");

exports.savePhase = async ({
  payload: { newPhase, tournamentId, onlyEntitySave = false },
}) => {
  const [savedPhase] = await sql`
        insert into tournament_phases ${sql(newPhase)} on conflict (id)
        do
        update set ${sql(newPhase)}
            returning *`;

  if (onlyEntitySave) return savedPhase;

  // only apply when adding succeed
  if (!newPhase.id && savedPhase.id) {
    await sql`UPDATE tournaments
                  SET entity_last_count = entity_last_count || jsonb_object(
                          ARRAY['phase'],
                          ARRAY[((entity_last_count ->> 'phase')::int + 1)::text])
                  WHERE id = ${tournamentId};`;
  }
  return savedPhase;
};

exports.saveGroup = async ({
  payload: { newGroup, match, tournamentId, onlyEntitySave = false },
}) => {
  const [savedGroup] = await sql`
        insert into tournament_groups ${sql(newGroup)} on conflict (id)
        do
        update set ${sql(newGroup)}
            returning *`;

  if (onlyEntitySave) return savedGroup;

  // add in groups_teams null teamid items for payload.teamsPerGroup times
  const groupsTeams = [];

  for (let i = 1; i <= savedGroup.teamsPerGroup; i++) {
    const groupTeam = {
      teamId: null,
      teamRanking: i,
      tournamentGroupId: savedGroup.id,
    };
    groupsTeams.push(groupTeam);
  }
  const groupMatches = [];

  const matchCount =
    (savedGroup.teamsPerGroup * savedGroup.teamsPerGroup -
      savedGroup.teamsPerGroup) /
    2;
  const totalMatchCount = savedGroup.doubleRoundRobin
    ? matchCount * 2
    : matchCount;

  for (let i = 1; i <= totalMatchCount; i++) {
    const groupMatch = {
      name: `Match ${match.count++}`,
      order: i,
      type: "group",
      roundType: null,
      startTime: null,
      homeTeamId: null,
      awayTeamId: null,
      groupId: savedGroup.id,
      phaseId: newGroup.tournamentPhaseId,
      futureTeamReference: null,
      groupTeamReference: null, //todo: fill after inserting savedGroupsTeams
      tournamentId: tournamentId,
    };
    groupMatches.push(groupMatch);
  }
  // multiple gt
  const savedGroupsTeams = await sql`
        insert into groups_teams ${sql(groupsTeams)} returning *`;

  // save gt_stat
  const groupsTeamsStat = [];
  savedGroupsTeams.forEach((item, index) => {
    const groupTeamStat = {
      played: 0,
      won: 0,
      draw: 0,
      lost: 0,
      points: 0,
      goalsFor: 0,
      goalsAway: 0,
      goalDifference: 0,
      groupsTeamsId: item.id,
    };
    groupsTeamsStat.push(groupTeamStat);
  });

  const savedGroupsTeamsStat = await sql`
        insert into groups_teams_stats ${sql(groupsTeamsStat)} returning *`;

  // todo: modify match->group_team_reference before insert
  let currMatchCount = 0;
  for (let i = 0; i < savedGroupsTeams?.length - 1; i++) {
    for (let j = i + 1; j < savedGroupsTeams?.length; j++) {
      groupMatches[currMatchCount++].groupTeamReference = {
        home: { groupTeamId: savedGroupsTeams?.[i]?.id },
        away: { groupTeamId: savedGroupsTeams?.[j]?.id },
      };
    }
  }
  const savedGroupsMatches = await exports.insertMatches({
    payload: { matches: groupMatches },
  });

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

exports.updateGroups = async ({ payload: { groups } }) => {
  const updatePromises = groups.map(async (group) => {
    const [updateGroup] = await sql`
            update tournament_groups
            set ${sql(group)}
            where id = ${group.id} returning *`;
    return updateGroup; // Return only the object, not the array
  });
  return Promise.all(updatePromises);
};

exports.updateBrackets = async ({ payload: { brackets } }) => {
  const updatePromises = brackets.map(async (bracket) => {
    const [updateBracket] = await sql`
            update tournament_brackets
            set ${sql(bracket)}
            where id = ${bracket.id} returning *`;
    return updateBracket; // Return only the object, not the array
  });
  return Promise.all(updatePromises);
};

exports.updateMatch = async ({ payload: { newMatch } }) => {
  //@formatter:off
  const [updatedMatch] = await sql`
    UPDATE matches
    SET
      ${newMatch.name !== undefined ? sql`name = ${newMatch.name},` : sql``}
      ${newMatch.order !== undefined ? sql`"order" = ${newMatch.order},` : sql``}
      ${newMatch.type !== undefined ? sql`type = ${newMatch.type},` : sql``}
      ${newMatch.roundType !== undefined ? sql`round_type = ${newMatch.roundType},` : sql``}
      ${newMatch.startTime !== undefined ? sql`start_time = ${newMatch.startTime},` : sql``}
      ${newMatch.homeTeamId !== undefined ? sql`home_team_id = ${newMatch.homeTeamId},` : sql``}
      ${newMatch.awayTeamId !== undefined ? sql`away_team_id = ${newMatch.awayTeamId},` : sql``}
      ${newMatch.phaseId !== undefined ? sql`phase_id = ${newMatch.phaseId},` : sql``}
      ${newMatch.groupId !== undefined ? sql`group_id = ${newMatch.groupId},` : sql``}
      ${newMatch.bracketId !== undefined ? sql`bracket_id = ${newMatch.bracketId},` : sql``}
      ${newMatch.futureTeamReference !== undefined ? sql`future_team_reference = ${newMatch.futureTeamReference},` : sql``}
      ${newMatch.groupTeamReference !== undefined ? sql`group_team_reference = ${newMatch.groupTeamReference},` : sql``}
      ${newMatch.matchDayId !== undefined ? sql`match_day_id = ${newMatch.matchDayId},` : sql``}
      ${newMatch.fieldId !== undefined ? sql`field_id = ${newMatch.fieldId},` : sql``}
      ${newMatch.tournamentId !== undefined ? sql`tournament_id = ${newMatch.tournamentId},` : sql``}
      ${newMatch.id !== undefined ? sql`id = ${newMatch.id}` : sql``} -- added intentionally for safety to have , free last col
    WHERE id = ${newMatch.id}
    RETURNING *;
  `;
  //@formatter:on
  return updatedMatch;
};

exports.updateMatches = async ({ payload: { matches, emailContent } }) => {
  const updatePromises = matches.map(async (match) => {
    const [updatedMatch] = await sql`
            update matches
            set ${sql(match)}
            where id = ${match.id} returning *`;
    return updatedMatch; // Return only the object, not the array
  });
  //send email to teamIds if matchTime changes
  // if (emailContent?.updatedMatchesIndex.length) {
  //   const { updatedMatchesIndex, fields } = emailContent;
  //
  //   const matchesWTimeChanged = matches.slice(
  //     updatedMatchesIndex[0],
  //     updatedMatchesIndex[1] + 1, // end index not inclusive in slice arr
  //   );
  //   //make sure teamIds are unique as matches teamId can be repetitive
  //   const teamIds = [
  //     ...new Set(
  //       matchesWTimeChanged
  //         .flatMap((match) => [match.homeTeamId, match.awayTeamId])
  //         .filter((id) => id !== null),
  //     ),
  //   ];
  //   const teams = await teamService.getTeamsWEmailOptionalById({
  //     teamIds,
  //   });
  //   //make map for matches, fields to easily find
  //   const teamsMap = {};
  //   teams.forEach((team) => (teamsMap[team.id] = team));
  //   const fieldsMap = {};
  //   fields.forEach((field) => (fieldsMap[field.id] = field));
  //
  //   matches.forEach((match) => {
  //     // TODO:send mail to teams id for each match
  //   });
  // }
  return Promise.all(updatePromises);
};

exports.insertMatches = async ({ payload: { matches } }) => {
  return sql`
        insert into matches ${sql(matches)} returning *`;
};

exports.saveGroupTeam = async ({ payload: { updateGroupTeam } }) => {
  const [savedGroupTeam] = await sql`
        insert into groups_teams ${sql(updateGroupTeam)} on conflict (id)
        do
        update set ${sql(updateGroupTeam)}
            returning *`;
  return savedGroupTeam;
};

exports.saveMatch = async ({
  payload: { newMatch, tournamentId, onlyEntitySave = false },
}) => {
  console.log(99, newMatch)
  const [savedMatch] = await sql`
        insert into matches ${sql(newMatch)} on conflict (id)
        do
        update set ${sql(newMatch)}
            returning *`;

  if (onlyEntitySave) return savedMatch;

  // only apply when adding succeed
  if (!newMatch.id && savedMatch.id) {
    await sql`
            UPDATE tournaments
            SET entity_last_count = entity_last_count || jsonb_object(
                    ARRAY['match'],
                    ARRAY[((entity_last_count ->> 'match')::int + 1)::text])
            WHERE id = ${tournamentId};`;
  }
  return savedMatch;
};

exports.saveBracket = async ({
  payload: { newBracket, match, tournamentId, onlyEntitySave = false },
}) => {
  const [savedBracket] = await sql`
        insert into tournament_brackets ${sql(newBracket)} on conflict (id)
        do
        update set ${sql(newBracket)}
            returning *`;

  if (onlyEntitySave) return savedBracket;

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

  match.count = Number(match.count);
  let maxTeamCount = savedBracket.teamsCount;
  let maxRoundCount = Math.round(Math.log2(maxTeamCount));
  let targetRoundIndex = -1; //one round behind
  // round iteration simulation
  // [roundType 2 - roundIndex 0]
  // [roundType 1- roundIndex 1]
  // [roundType 0 - roundIndex 2]

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
        tournamentId: tournamentId,
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
        tournamentId: tournamentId,
      });
    }
    targetRoundIndex++;
    maxTeamCount = maxTeamCount / 2;
    returnedBracket.rounds.push(newRound);
  }

  // only apply when adding succeed
  if (!newBracket.id && savedBracket.id) {
    await sql`
            UPDATE tournaments
            SET entity_last_count = entity_last_count || jsonb_object(
                    ARRAY['bracket', 'match'],
                    ARRAY[((entity_last_count ->> 'bracket')::int + 1)::text, 
                                 ${match.count}::text])
            WHERE id = ${tournamentId};`;
  }
  return returnedBracket;
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
      rankingPublished: false,
      teamsPerGroup: groupMemberCount,
      doubleRoundRobin: false,
      order: i,
      tournamentPhaseId: savedPhase.id,
    };
    const savedGroup = await exports.saveGroup({
      payload: {
        newGroup,
        match: { count: entityLastCount.match, phaseId: savedPhase.id },
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

exports.updatePhaseItems = async ({
  payload: { groups, brackets, matches },
  organizerId,
}) => {
  let updatedGroups = [];
  let updatedBrackets = [];
  let updatedMatches = [];

  if (groups.length > 0) {
    updatedGroups = await exports.updateGroups({ payload: { groups } });
  }
  if (brackets.length > 0) {
    updatedBrackets = await exports.updateBrackets({ payload: { brackets } });
  }
  if (matches.length > 0) {
    updatedMatches = await exports.updateMatches({ payload: { matches } });
  }
  return { updatedGroups, updatedBrackets, updatedMatches };
};

exports.getTournamentFormat = async ({ tournamentId, organizerId }) => {
  const tournament = await tournamentService.getTournament({ tournamentId });

  //@formatter:off
  let result = await sql`
        SELECT DISTINCT tp.id                                                      AS phase_id,
                        tp.name                                                    AS phase_name,
                        tp.order                                                   AS phase_order,
                        CASE WHEN m.type = 'group' THEN tg.id END                  AS group_id,
                        CASE WHEN m.type = 'group' THEN tg.name END                AS group_name,
                        CASE WHEN m.type = 'group' THEN tg.ranking_published END   AS ranking_published,
                        CASE WHEN m.type = 'group' THEN tg.order END               AS group_order,
                        CASE WHEN m.type = 'group' THEN tg.double_round_robin END  AS double_round_robin,
                        CASE WHEN m.type = 'group' THEN tg.teams_per_group END     AS teams_per_group,
                        CASE WHEN m.type = 'group' THEN gt.id END                  AS group_team_id,
                        CASE WHEN m.type = 'group' THEN gt.team_id END             AS team_id,
                        CASE WHEN m.type = 'group' THEN gt.team_ranking END        AS team_ranking,
                        CASE WHEN m.type = 'group' THEN t1.name END                AS group_team_name,
                        CASE WHEN m.type = 'group' THEN m.group_team_reference END AS match_group_team_reference,
                        CASE WHEN m.type = 'bracket' THEN tb.id END                AS bracket_id,
                        CASE WHEN m.type = 'bracket' THEN tb.name END              AS bracket_name,
                        CASE WHEN m.type = 'bracket' THEN tb.order END             AS bracket_order,
                        CASE WHEN m.type = 'bracket' THEN tb.teams_count END       AS teams_count,
                        m.id                                                       AS match_id,
                        m.name                                                     AS match_name,
                        m.type                                                     AS match_type,
                        m.order                                                    AS match_order,
                        m.future_team_reference                                    AS match_future_team_reference,
                        m.round_type,
                        m.start_time,
                        m.home_team_id,
                        m.away_team_id,
                        mr.home_team_score,
                        mr.away_team_score,
                        mr.winner_id
        FROM tournament_phases tp
                 LEFT JOIN tournament_groups tg
                           ON tg.tournament_phase_id = tp.id
                 LEFT JOIN groups_teams gt
                           ON gt.tournament_group_id = tg.id
                 LEFT JOIN teams t1
                           ON t1.id = gt.team_id
                 LEFT JOIN tournament_brackets tb
                           ON tb.tournament_phase_id = tp.id
                 LEFT JOIN matches m
                           ON (
                               (m.type = 'group' AND m.group_id = tg.id AND
                                (gt.team_id = m.home_team_id OR gt.team_id = m.away_team_id) OR
                                (gt.id = (m.group_team_reference -> 'home' ->> 'groupTeamId')::INTEGER OR
                         gt.id = (m.group_team_reference -> 'away' ->> 'groupTeamId')::INTEGER))
                                   OR (m.type = 'bracket' AND m.bracket_id = tb.id)
                                   OR (m.type = 'single_match' AND m.phase_id = tp.id)
                               )
                 LEFT JOIN match_results mr
                           ON mr.match_id = m.id
        WHERE tp.tournament_id = ${tournamentId};
    `;
  //@formatter:on

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
          rankingPublished: row.rankingPublished,
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
            futureTeamReference: row.matchFutureTeamReference, // TODO: change to groupTeam
            groupTeamReference: row.matchGroupTeamReference,
          });
        }
      }
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
            winnerId: row.winnerId,
            futureTeamReference: row.matchFutureTeamReference,
            groupTeamReference: row.matchGroupTeamReference,
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
          winnerId: row.winnerId,
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
        winnerId: row.winnerId,
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
    participants,
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
        itemId: team.teamId,
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
        // phaseItem.rankingPublished = phaseItem.matches.some(
        //   (match) =>
        //     match?.homeTeamScore != null && match?.awayTeamScore != null,
        // );
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
  participants,
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
        });
      }
    } else if (phaseItem.type === "single_match") {
      //for match, populate twice
      const positions = [1, 2];
      positions.forEach((position) => {
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
    //keyId = phaseItem.id
    const team = Object.values(teams).find(
      (item) => item.teamRanking === keyPosition,
    );
    const { id, futureTeamReference, groupTeamReference } = team || {};

    // map groupRef & futureTeamRef with gt.id to get reference
    const reference =
      team.id === team.groupTeamReference?.home?.groupTeamId
        ? team.futureTeamReference?.home
        : team.id === team.groupTeamReference?.away?.groupTeamId
          ? team.futureTeamReference?.away
          : null;

    // direct team assigned -> if teamId != null && futureTeamReference == null
    if (team?.teamId && !reference?.id) {
      selectedTeamOptions[`g-${keyId}-${keyPosition}`] = {
        ...teamOptions[`t-${team.teamId}`],
        // groupTeamId: hostGroupTeamId,
        groupTeamId: team.id,
      };
      (teamOptions[`t-${team.teamId}`] ??= {}).used = true;
      return;
    }

    if (!reference?.id) {
      return (selectedTeamOptions[`g-${keyId}-${keyPosition}`] = {
        ...teamOptions["empty"],
        // groupTeamId: hostGroupTeamId,
        groupTeamId: team.id,
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
          // groupTeamId: hostGroupTeamId,
          groupTeamId: team.id,
        });
      } else if (foundGroup?.rankingPublished === false) {
        (teamOptions[`g-${foundGroup.id}-${position}`] ??= {}).used = true;
        return (selectedTeamOptions[`g-${keyId}-${keyPosition}`] = {
          ...teamOptions[`g-${foundGroup.id}-${position}`],
          // groupTeamId: hostGroupTeamId,
          groupTeamId: team.id,
        });
      } else {
        // if ref group deleted & not found, return teamOptions["empty"]
        return (selectedTeamOptions[`g-${keyId}-${keyPosition}`] = {
          ...teamOptions["empty"],
          // groupTeamId: hostGroupTeamId,
          groupTeamId: team.id,
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
          // groupTeamId: hostGroupTeamId,
          groupTeamId: team.id,
        });
      } else if (foundMatch?.rankingPublished === false) {
        (teamOptions[`m-${refId}-${position}`] ??= {}).used = true;

        return (selectedTeamOptions[`g-${keyId}-${keyPosition}`] = {
          ...teamOptions[`m-${refId}-${position}`],
          // groupTeamId: hostGroupTeamId,
          groupTeamId: team.id,
        });
      } else {
        // if ref match deleted & not found, return teamOptions["empty"]
        return (selectedTeamOptions[`g-${keyId}-${keyPosition}`] = {
          ...teamOptions["empty"],
          // groupTeamId: hostGroupTeamId,
          groupTeamId: team.id,
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

    if (match.homeTeamId && presentTeamPosition === 1) {
      (teamOptions[`t-${match.homeTeamId}`] ??= {}).used = true;
      return (selectedTeamOptions[`m-${match.id}-${presentTeamPosition}`] =
        teamOptions[`t-${match.homeTeamId}`]);
    }
    if (match.awayTeamId && presentTeamPosition === 2) {
      (teamOptions[`t-${match.awayTeamId}`] ??= {}).used = true;
      return (selectedTeamOptions[`m-${match.id}-${presentTeamPosition}`] =
        teamOptions[`t-${match.awayTeamId}`]);
    }

    // Process both home and away references
    const reference =
      presentTeamPosition === 1
        ? futureTeamReference?.home
        : presentTeamPosition === 2
          ? futureTeamReference?.away
          : {};

    if (!reference?.id) {
      return (selectedTeamOptions[`m-${match.id}-${presentTeamPosition}`] =
        teamOptions["empty"]);
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
      } else {
        // if ref group deleted & not found, return teamOptions["empty"]
        return (selectedTeamOptions[`m-${match.id}-${presentTeamPosition}`] =
          teamOptions["empty"]);
      }
      return (selectedTeamOptions[`m-${match.id}-${presentTeamPosition}`] =
        val);
    } else if (type === "match") {
      const foundMatch = matches[refId];

      let val = null;

      if (foundMatch?.rankingPublished === true) {
        let foundTeamId = null;
        //TODO: replace foundTeamId with winnerid
        if (
          (position === 1 &&
            foundMatch?.homeTeamScore > foundMatch?.awayTeamScore) ||
          (position === 2 &&
            foundMatch?.homeTeamScore < foundMatch?.awayTeamScore)
        ) {
          // teams[] is obj with key teamId, teamOptions[] obj with key gt.id
          // first retrive gt.id from teams using teamId, then retrieve teamOptions using gt.id
          foundTeamId = participants.find(
            (team) => team.teamId === foundMatch?.homeTeamId,
          )?.teamId;
        } else {
          foundTeamId = participants.find(
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
      } else {
        // if ref match deleted & not found, return teamOptions["empty"]
        return (selectedTeamOptions[`m-${match.id}-${presentTeamPosition}`] =
          teamOptions["empty"]);
      }
    }
  }
};
