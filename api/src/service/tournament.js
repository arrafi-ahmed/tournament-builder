const CustomError = require("../model/CustomError");
const { sql } = require("../db");
const {
  removeImages,
  appInfo,
  ifSudo,
  ifOrganizer,
  generateTournamentInvitationContent,
} = require("../others/util");
const userService = require("../service/user");
const mailService = require("../service/sendMail");

exports.save = async ({ payload, currentUser }) => {
  // currentUser is sudo
  if (ifSudo(currentUser.role)) {
    let foundUser = await userService.getUserByEmail({
      email: payload.organizerEmail,
    });

    // while adding tournament
    if (!payload.id) {
      // organizer email doesn't exist
      if (!foundUser || !ifOrganizer(foundUser.role)) {
        throw new CustomError("Email isn't associated with any organizer!");
      }
    }
    payload.organizerId = foundUser.id;
  }
  // currentUser is organizer
  else if (ifOrganizer(currentUser.role)) {
    payload.organizerId = currentUser.id;
  }
  delete payload.organizerEmail;
  delete payload.email;
  delete payload.tId;
  delete payload.uId;

  const [insertedTournament] = await sql`
        insert into tournaments ${sql(payload)} on conflict (id)
        do
        update set ${sql(payload)} returning *`;

  return insertedTournament;
};

exports.removeTournament = async ({ tournamentId }) => {
  const [deletedTournament] = await sql`
        delete
        from tournaments
        where id = ${tournamentId} returning *;`;

  if (deletedTournament.logo) {
    await removeImages([deletedTournament.logo]);
  }
  return deletedTournament;
};

exports.removeMember = async ({ id, tournamentId }) => {
  const [deletedMember] = await sql`
        delete
        from tournament_members
        where id = ${id}
          and tournament_id = ${tournamentId} returning *;`;
  return deletedMember;
};

exports.getAllTournamentsWEmail = async () => {
  return sql`SELECT t.*, t.id as t_id, u.id as u_id, u.email
               FROM tournaments t
                        left join users u
                                  on t.manager_id = u.id
                                      and u.role = 'tournament_manager'
               order by t.id desc`;
};

exports.searchTournament = async ({ searchKeyword }) => {
  const tournaments = await sql`
        SELECT *, id as tournament_id
        FROM tournaments
        WHERE name ilike concat('%', ${searchKeyword}::text
            , '%')`;
  return tournaments;
};

exports.getJoinRequests = async ({ teamId }) => {
  const teamRequests = await sql`
        select *, tr.id as id
        from team_requests tr
                 join tournaments t on tr.tournament_id = t.id
        where tr.team_id = ${teamId}`;

  return teamRequests;
};

exports.saveTeamRequest = async ({ teamId, tournamentId }) => {
  if (!teamId) {
    throw new CustomError("No team Id provided!");
  }

  const teamRequest = { requestStatus: 2, teamId, tournamentId };
  const [insertedRequest] = await sql`
        insert into team_requests ${sql(teamRequest)} returning *`;
  return insertedRequest;
};

exports.removeTeamRequest = async ({ teamId, requestId, tournamentId }) => {
  if (!teamId || !requestId || !tournamentId) {
    throw new CustomError("Bad request!");
  }

  const [deletedRequest] = await sql`
        delete
        from team_requests
        where id = ${requestId}
          and team_id = ${teamId}
          and tournament_id = ${tournamentId} returning *`;

  if (!deletedRequest) {
    throw new CustomError("Request cancel failed!");
  }
  return deletedRequest;
};

exports.getTournamentWEmailOptionalById = async ({ tournamentId }) => {
  const [tournament] = await sql`
        SELECT t.*, t.id as t_id, u.id as u_id, u.email
        FROM tournaments t
                 left join users u
                           on t.organizer_id = u.id and u.role = 'organizer'
        WHERE t.id = ${tournamentId}`;

  return tournament;
};

exports.getParticipants = async ({ tournamentId, organizerId }) => {
  const teams = await sql`
        SELECT tt.*,
               tm.*,
               tt.id as tt_id,
               tm.id as tm_id
        FROM teams_tournaments tt
                 left join teams tm on tt.team_id = tm.id
        WHERE tt.tournament_id = ${tournamentId}`;
  return teams;
};

exports.getParticipantsWTournament = async ({ tournamentId, organizerId }) => {
  const teams = await sql`
        SELECT tu.*,
               tt.*,
               tm.*,
               tu.name as tu_name,
               tu.id   as tu_id,
               tt.id   as tt_id,
               tm.id   as tm_id
        FROM tournaments tu
                 left join teams_tournaments tt
                           on tt.tournament_id = tu.id
                 left join teams tm on tt.team_id = tm.id
        WHERE tu.id = ${tournamentId} ${
          organizerId
            ? sql` and tu.organizer_id =
                        ${organizerId}`
            : sql``
        }`;

  return teams;
};

exports.addParticipant = async ({
  teamId,
  tournamentId,
  tournamentName,
  managerEmail,
}) => {
  const newTeamTournament = { teamId, tournamentId };
  const insertedTeamTournament = await sql`
        insert into teams_tournaments
            ${sql(newTeamTournament)} on conflict (team_id, tournament_id)
        do nothing
        returning *`;

  if (insertedTeamTournament.length === 0)
    throw new CustomError("Team already added to Tournament!", 409);

  //send email
  const html = generateTournamentInvitationContent({
    tournamentName,
  });
  const subject = `Team added to tournament on ${appInfo.name}`;
  // send email to team manager with credential
  mailService.sendMail(managerEmail, subject, html);

  return insertedTeamTournament[0];
};

exports.removeParticipant = async ({ id, teamId, tournamentId }) => {
  const [removedTicket] = await sql`
        delete
        from teams_tournaments
        where id = ${id}
          and team_id = ${teamId}
          and tournament_id = ${tournamentId} returning *`;

  return removedTicket;
};

exports.getTournament = async ({ tournamentId }) => {
  const [tournament] = await sql`
        SELECT *
        FROM tournaments
        WHERE id = ${tournamentId}`;
  return tournament;
};

exports.getEventByEventIdnClubId = async ({ clubId, eventId }) => {
  return sql`
        select *
        from event
        where id = ${eventId}
          and club_id = ${clubId}
        order by id desc`;
};

exports.getTournamentsByOrganizerId = async ({ organizerId }) => {
  return sql`
        SELECT *
        FROM tournaments ${
          organizerId === "all"
            ? sql``
            : sql`WHERE organizer_id =
                        ${organizerId}`
        }
        ORDER BY id DESC`;
};

exports.getAllActiveEvents = async ({ clubId, currentDate }) => {
  // const currentDate = new Date().toISOString().split("T")[0]; // Format the date as YYYY-MM-DD

  const results = await sql`
        SELECT *
        FROM event
        WHERE club_id = ${clubId}
          AND ${currentDate}::date < end_date
          AND registration_count < max_attendees
        ORDER BY id DESC;
    `;
  return results;
};

exports.saveMember = async ({ payload: member }) => {
  // if add request
  if (!member.id) {
    delete member.id;
  }
  const [upsertedMember] = await sql`
        insert into tournament_members ${sql(member)} on conflict (id)
        do
        update set ${sql(member)}
            returning *`;
  return upsertedMember;
};
