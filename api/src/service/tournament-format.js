const { sql } = require("../db");

exports.getTournamentFormat = async ({ tournamentId }) => {
  const result = await sql`
        SELECT tp.id                    AS phase_id,
               tp.name                  AS phase_name,
               tp.phase_order,
               tg.id                    AS group_id,
               tg.name                  AS group_name,
               tg.group_order,
               tg.double_round_robin,
               gt.id                    AS group_team_id,
               gt.team_ranking,
               gt.team_id               AS team_id,
               t1.name                  AS group_team_name, -- Group team name
               gt.future_team_reference AS group_future_team_reference,
               tb.id                    AS bracket_id,
               tb.name                  AS bracket_name,
               tb.bracket_order,
               m.id                     AS match_id,
               m.name                   AS match_name,
               m.match_type,
               m.match_order,
               m.future_team_reference  AS match_future_team_reference,
               m.round_type,
               m.start_time,
               m.home_team_id,
               t2.name                  AS home_team_name,  -- Home team name
               m.away_team_id,
               t3.name                  AS away_team_name,  -- Away team name
               mr.home_team_score,
               mr.away_team_score,
               mr.winner_id
        FROM tournament_phases tp
                 LEFT JOIN tournament_groups tg ON tg.tournament_phase_id = tp.id
                 LEFT JOIN groups_teams gt ON gt.tournament_group_id = tg.id
                 LEFT JOIN teams t1 ON t1.id = gt.team_id -- Join for group team name
                 LEFT JOIN tournament_brackets tb ON tb.tournament_phase_id = tp.id
                 LEFT JOIN matches m ON m.tournament_phase_id = tp.id
                 LEFT JOIN teams t2 ON t2.id = m.home_team_id -- Join for home team name
                 LEFT JOIN teams t3 ON t3.id = m.away_team_id -- Join for away team name
                 LEFT JOIN match_results mr ON mr.match_id = m.id
        WHERE tp.tournament_id = ${tournamentId}
        ORDER BY tp.phase_order ASC,
                 tb.bracket_order ASC,
                 m.round_type DESC,
                 m.match_order ASC;`;

  const format = processTournamentData(result);
  // return format;
  console.log(29,tournamentId)
  return tournamentId == 6 ? demoFormat : format;
};

const processTournamentData = (rawData) => {
  const phasesMap = new Map();

  rawData.forEach((row) => {
    // Get or create the phase
    if (!phasesMap.has(row.phaseId)) {
      phasesMap.set(row.phaseId, {
        id: row.phaseId,
        name: row.phaseName,
        groupsCount: row.groupsCount,
        teamsPerGroup: row.teamsPerGroup,
        qualifyingTeams: row.qualifyingTeams,
        phaseOrder: row.phaseOrder,
        updatedAt: row.phaseUpdatedAt,
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
          groupOrder: row.groupOrder,
          doubleRoundRobin: row.doubleRoundRobin,
          updatedAt: row.groupUpdatedAt,
          teams: [], // Initialize an empty array for teams
          order: row.groupOrder, // Include order for sorting
        };
        phase.items.push(group);
      }

      // Add the team to the group if team data exists
      if (row.teamId) {
        group.teams.push({
          id: row.teamId,
          name: row.groupTeamName,
          teamRanking: row.teamRanking,
          futureTeamReference: row.futureTeamReference,
          updatedAt: row.groupUpdatedAt,
        });
      }
    }

    // Process bracket data if available
    if (row.bracketId) {
      let bracket = phase.items.find(
        (item) => item.type === "bracket" && item.id === row.bracketId
      );
      if (!bracket) {
        bracket = {
          id: row.bracketId,
          type: "bracket",
          name: row.bracketName,
          bracketOrder: row.bracketOrder,
          updatedAt: row.bracketUpdatedAt,
          rounds: [], // Initialize an empty array for rounds
          order: row.bracketOrder, // Include order for sorting
        };
        phase.items.push(bracket);
      }

      // Add round data to the bracket
      if (row.matchId) {
        const roundIndex = bracket.rounds.findIndex(
          (round) => round.roundType === row.roundType
        );
        if (roundIndex === -1) {
          bracket.rounds.push({
            type: row.roundType,
            matches: [
              {
                id: row.matchId,
                name: row.matchName,
                matchOrder: row.matchOrder,
                startTime: row.startTime,
                updatedAt: row.matchUpdatedAt,
                homeTeamId: row.homeTeamId,
                awayTeamId: row.awayTeamId,
                homeTeamName: row.homeTeamName,
                awayTeamName: row.awayTeamName,
                homeTeamScore: row.homeTeamScore,
                awayTeamScore: row.awayTeamScore,
                winnerId: row.winnerId,
                futureTeamReference: row.futureTeamReference,
              },
            ],
          });
        } else {
          bracket.rounds[roundIndex].matches.push({
            id: row.matchId,
            name: row.matchName,
            matchOrder: row.matchOrder,
            startTime: row.startTime,
            updatedAt: row.matchUpdatedAt,
            homeTeamId: row.homeTeamId,
            awayTeamId: row.awayTeamId,
            homeTeamName: row.homeTeamName,
            awayTeamName: row.awayTeamName,
            homeTeamScore: row.homeTeamScore,
            awayTeamScore: row.awayTeamScore,
            winnerId: row.winnerId,
            futureTeamReference: row.futureTeamReference,
          });
        }
      }
    }

    // Process single matches
    if (row.matchType === "single_match") {
      phase.items.push({
        id: row.matchId,
        type: "single_match",
        name: row.matchName,
        matchOrder: row.matchOrder,
        startTime: row.startTime,
        updatedAt: row.matchUpdatedAt,
        homeTeamId: row.homeTeamId,
        awayTeamId: row.awayTeamId,
        homeTeamName: row.homeTeamName,
        awayTeamName: row.awayTeamName,
        homeTeamScore: row.homeTeamScore,
        awayTeamScore: row.awayTeamScore,
        winnerId: row.winnerId,
        futureTeamReference: row.futureTeamReference,
        order: row.matchOrder, // Include order for sorting
      });
    }
  });

  // Convert Maps back to arrays and sort items
  Array.from(phasesMap.values()).map((phase) => {
    // Sort items by their order
    phase.items.sort((a, b) => a.order - b.order);

    // Sort rounds and matches within brackets
    phase.items.forEach((item) => {
      if (item.type === "bracket") {
        item.rounds.forEach((round) => {
          round.matches.sort((a, b) => a.matchOrder - b.matchOrder);
        });
      }
    });
    return phase;
  });
  return phasesMap;
};

const demoFormat = [
  {
    id: 1,
    name: "Phase 1",
    groupsCount: 2,
    teamsPerGroup: 4,
    qualifyingTeams: 2,
    phaseOrder: 1,
    updatedAt: "2024-08-19T12:00:00Z",
    items: [
      {
        id: 1,
        type: "group",
        name: "Group A",
        groupOrder: 1,
        doubleRoundRobin: true,
        updatedAt: "2024-08-19T12:00:00Z",
        teams: [
          {
            id: 1,
            teamId: 2,
            name: "FCB",
            teamRanking: 1,
            futureTeamReference: {
              type: "group",
              id: 1,
              position: 1,
            },
            updatedAt: "2024-08-19T12:00:00Z",
          },
          {
            id: 2,
            teamId: 3,
            name: "RM",
            teamRanking: 2,
            futureTeamReference: {
              // type: "group",
              // id: 1,
              // position: 2,
            },
            updatedAt: "2024-08-19T12:00:00Z",
          },
        ],
      },
      {
        id: 2,
        type: "group",
        name: "Group B",
        groupOrder: 1,
        doubleRoundRobin: false,
        updatedAt: "2024-08-20T12:00:00Z",
        teams: [
          {
            id: 3,
            teamId: 4,
            name: "Atletico",
            teamRanking: 2,
            futureTeamReference: {
              type: "group",
              id: 1,
              position: 2,
            },
            updatedAt: "2024-08-19T12:00:00Z",
          },
          {
            id: 4,
            teamId: 5,
            name: "ManU",
            teamRanking: 2,
            futureTeamReference: {
              type: "group",
              id: 1,
              position: 2,
            },
            updatedAt: "2024-08-19T12:00:00Z",
          },
        ],
      },
      // {
      //   id: 10,
      //   type: "single_match",
      //   name: "Match 10",
      //   matchOrder: 1,
      //   startTime: "2024-08-20T14:00:00Z",
      //   homeTeamId: 2,
      //   awayTeamId: 4,
      //   homeTeamScore: null,
      //   awayTeamScore: null,
      //   winnerId: null,
      //   futureTeamReference: {
      //     // home: { type: "match", id: 1, position: 2 },
      //     // away: { type: "match", id: 2, position: 2 },
      //   },
      // },
    ],
  },
  {
    id: 2,
    name: "Phase 2",
    groupsCount: 1,
    teamsPerGroup: 4,
    qualifyingTeams: 1,
    phaseOrder: 2,
    updatedAt: "2024-08-20T12:00:00Z",
    items: [
      {
        id: 1,
        type: "bracket",
        name: "Bracket 1",
        bracketOrder: 1,
        updatedAt: "2024-08-19T12:00:00Z",
        rounds: [
          {
            type: 1,
            matches: [
              {
                id: 1,
                name: "Match 1",
                matchOrder: 1,
                startTime: "2024-08-19T14:00:00Z",
                homeTeamId: 1,
                awayTeamId: 2,
                homeTeamScore: 2,
                awayTeamScore: 1,
                winnerId: 1,
                futureTeamReference: {
                  home: { type: "group", id: 1, position: 1 },
                  away: { type: "group", id: 2, position: 1 },
                },
              },
              {
                id: 2,
                name: "Match 2",
                matchOrder: 2,
                startTime: "2024-08-19T14:00:00Z",
                homeTeamId: 2,
                awayTeamId: 1,
                homeTeamScore: 2,
                awayTeamScore: 1,
                winnerId: 1,
                futureTeamReference: {
                  home: { type: "group", id: 1, position: 2 },
                  away: { type: "group", id: 2, position: 2 },
                },
              },
            ],
          },
          {
            type: 0,
            matches: [
              {
                id: 3,
                name: "Match 3",
                matchOrder: 1,
                startTime: "2024-08-19T14:00:00Z",
                homeTeamId: 1,
                awayTeamId: 2,
                homeTeamScore: 2,
                awayTeamScore: 1,
                winnerId: 1,
                futureTeamReference: {
                  home: { type: "match", id: 1, position: 1 },
                  away: { type: "match", id: 2, position: 1 },
                },
              },
            ],
          },
        ],
      },
      // {
      //   id: 4,
      //   type: "single_match",
      //   name: "Match 4",
      //   matchOrder: 1,
      //   startTime: "2024-08-20T14:00:00Z",
      //   homeTeamId: null,
      //   awayTeamId: null,
      //   homeTeamScore: null,
      //   awayTeamScore: null,
      //   winnerId: null,
      //   futureTeamReference: {
      //     home: { type: "match", id: 1, position: 2 },
      //     away: { type: "match", id: 2, position: 2 },
      //   },
      // },
      // {
      //   id: 6,
      //   type: "group",
      //   name: "Group C",
      //   groupOrder: 3,
      //   doubleRoundRobin: false,
      //   updatedAt: "2024-08-20T12:00:00Z",
      //   teams: [
      //     {
      //       id: 5,
      //       // teamId: 3,
      //       // name: "Atletico",
      //       // teamRanking: 2,
      //       futureTeamReference: {
      //         type: "group",
      //         id: 1,
      //         position: 1,
      //       },
      //       updatedAt: "2024-08-19T12:00:00Z",
      //     },
      //     {
      //       id: 6,
      //       // teamId: 4,
      //       // name: "ManU",
      //       // teamRanking: 2,
      //       futureTeamReference: {
      //         type: "match",
      //         id: 10,
      //         position: 1,
      //       },
      //       updatedAt: "2024-08-19T12:00:00Z",
      //     },
      //   ],
      // },
    ],
  },
];
// const demoFormat = [
//   {
//     id: 1,
//     name: "Phase 1",
//     groupsCount: 2,
//     teamsPerGroup: 4,
//     qualifyingTeams: 2,
//     phaseOrder: 1,
//     updatedAt: "2024-08-19T12:00:00Z",
//     items: [
//       {
//         id: 1,
//         type: "group",
//         name: "Group A",
//         groupOrder: 1,
//         doubleRoundRobin: true,
//         updatedAt: "2024-08-19T12:00:00Z",
//         teams: [
//           {
//             id: 1,
//             teamId: 1,
//             name: "Barca",
//             teamRanking: 1,
//             futureTeamReference: {
//               type: "group",
//               id: 1,
//               position: 1,
//             },
//             updatedAt: "2024-08-19T12:00:00Z",
//           },
//           {
//             id: 2,
//             teamId: 2,
//             name: "RM",
//             teamRanking: 2,
//             futureTeamReference: {
//               type: "group",
//               id: 1,
//               position: 2,
//             },
//             updatedAt: "2024-08-19T12:00:00Z",
//           },
//         ],
//       },
//       {
//         id: 1,
//         type: "bracket",
//         name: "Bracket 1",
//         bracketOrder: 1,
//         updatedAt: "2024-08-19T12:00:00Z",
//         rounds: [
//           {
//             type: 1,
//             matches: [
//               {
//                 id: 1,
//                 name: "Match 1",
//                 matchOrder: 1,
//                 startTime: "2024-08-19T14:00:00Z",
//                 homeTeamId: 1,
//                 awayTeamId: 2,
//                 homeTeamName: "Barca",
//                 awayTeamName: "RM",
//                 homeTeamScore: 2,
//                 awayTeamScore: 1,
//                 winnerId: 1,
//               },
//               {
//                 id: 2,
//                 name: "Match 2",
//                 matchOrder: 2,
//                 startTime: "2024-08-19T14:00:00Z",
//                 homeTeamId: 2,
//                 awayTeamId: 1,
//                 homeTeamName: "RM",
//                 awayTeamName: "Barca",
//                 homeTeamScore: 2,
//                 awayTeamScore: 1,
//                 winnerId: 1,
//               },
//             ],
//           },
//           {
//             type: 0,
//             matches: [
//               {
//                 id: 3,
//                 name: "Match 4",
//                 matchOrder: 1,
//                 startTime: "2024-08-19T14:00:00Z",
//                 homeTeamId: 1,
//                 awayTeamId: 2,
//                 homeTeamName: "Barca",
//                 awayTeamName: "RM",
//                 homeTeamScore: 2,
//                 awayTeamScore: 1,
//                 winnerId: 1,
//                 futureTeamReference: {
//                   home: { type: "match", id: 1, position: 1 },
//                   away: { type: "match", id: 2, position: 1 },
//                 },
//               },
//             ],
//           },
//         ],
//       },
//       {
//         id: 4,
//         type: "single_match",
//         name: "Match 3",
//         matchOrder: 1,
//         startTime: "2024-08-20T14:00:00Z",
//         homeTeamId: 3,
//         awayTeamId: 4,
//         homeTeamName: "Roma",
//         awayTeamName: "Atletico",
//         homeTeamScore: 3,
//         awayTeamScore: 2,
//         winnerId: 3,
//       },
//     ],
//   },
//   {
//     id: 2,
//     name: "Phase 2",
//     groupsCount: 1,
//     teamsPerGroup: 4,
//     qualifyingTeams: 1,
//     phaseOrder: 2,
//     updatedAt: "2024-08-20T12:00:00Z",
//     items: [
//       {
//         id: 2,
//         type: "group",
//         name: "Group B",
//         groupOrder: 1,
//         doubleRoundRobin: false,
//         updatedAt: "2024-08-20T12:00:00Z",
//         teams: [
//           {
//             id: 3,
//             // teamId: 3,
//             // name:'Roma',
//             // teamRanking: 1,
//             futureTeamReference: {
//               type: "group",
//               id: 1,
//               position: 1,
//             },
//             updatedAt: "2024-08-20T12:00:00Z",
//           },
//           {
//             id: 4,
//             futureTeamReference: {
//               type: "match",
//               id: 4,
//               position: 1,
//             },
//             updatedAt: "2024-08-20T12:00:00Z",
//           },
//         ],
//       },
//       {
//         id: 5,
//         type: "single_match",
//         name: "Match 5",
//         matchOrder: 1,
//         startTime: "2024-08-20T14:00:00Z",
//         homeTeamId: null,
//         awayTeamId: null,
//         homeTeamName: null,
//         awayTeamName: null,
//         homeTeamScore: null,
//         awayTeamScore: null,
//         winnerId: null,
//         futureTeamReference: {
//           home: { type: "match", id: 1, position: 1 },
//           away: { type: "match", id: 4, position: 2 },
//         },
//       },
//       {
//         id: 6,
//         type: "single_match",
//         name: "Match 6",
//         matchOrder: 1,
//         startTime: "2024-08-20T14:00:00Z",
//         homeTeamId: null,
//         awayTeamId: null,
//         homeTeamName: null,
//         awayTeamName: null,
//         homeTeamScore: null,
//         awayTeamScore: null,
//         winnerId: null,
//         futureTeamReference: {
//           home: { type: "group", id: 1, position: 2 },
//           away: { type: "match", id: 4, position: 1 },
//         },
//       },
//     ],
//   },
// ];