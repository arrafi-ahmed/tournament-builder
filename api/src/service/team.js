const CustomError = require("../model/CustomError");
const { sql } = require("../db");
const {
  removeImages,
  generateManagerCredentialContent,
  appInfo,
  generateTournamentInvitationContent,
} = require("../others/util");
const userService = require("../service/user");
const mailService = require("../service/sendMail");

exports.save = async ({ payload, files }) => {
  const foundTeamManager = await exports.getTeamByManagerEmail({
    email: payload.email,
  });
  let foundUser = await userService.getUserByEmail({ email: payload.email });
  // while adding team
  if (!payload.id) {
    // email exists and belongs to other manager
    if (foundTeamManager) {
      throw new CustomError("Email not available!");
    }
    // email exists and belongs to other user role
    else if (foundUser && foundUser.role !== "team_manager") {
      throw new CustomError("Email not available!");
    }
  }
  //while editing team
  else {
    if (foundTeamManager.tId != payload.id) {
      throw new CustomError("edit:Email already associated with a manager!");
    }
  }
  let sendEmail = false;
  if (!foundUser) {
    foundUser = await userService.save({
      payload: {
        email: payload.email,
        role: "team_manager",
      },
    });
    sendEmail = true;
  }

  if (sendEmail) {
    const html = generateManagerCredentialContent({
      teamName: payload.name,
      credential: { username: foundUser.email, password: foundUser.password },
    });
    const subject = `Added as team manager on ${appInfo.name}`;
    // send email to team manager with credential
    mailService.sendMail(payload.email, subject, html);
  }

  const team = {
    ...payload,
    managerId: foundUser.id,
  };
  // if (!team.id) {
  //   team.registrationCount = 0;
  // } else if (currentUser.role != "sudo") {
  //   //if updating event make sure user is authorized
  //   const [event] = await exports.getEventByEventIdnClubId({
  //     eventId: team.id,
  //     clubId: currentUser.clubId,
  //   });
  //   if (!event || !event.id) throw new CustomError("Access denied", 401);
  // }
  //add banner
  if (files && files.length > 0) {
    team.logo = files[0].filename;
  }
  //remove banner
  if (payload.rmImage) {
    await removeImages([payload.rmImage]);
    delete team.rmImage;

    if (!team.logo) delete team.logo;
  }
  if (team.email) delete team.email;

  const [insertedTeam] = await sql`
        insert into teams ${sql(team)} on conflict (id)
        do
        update set ${sql(team)} returning *`;

  return insertedTeam;
};

exports.removeTeam = async ({ teamId }) => {
  const [deletedTeam] = await sql`
        delete
        from teams
        where id = ${teamId} returning *;`;

  if (deletedTeam.logo) {
    await removeImages([deletedTeam.logo]);
  }
  return deletedTeam;
};

exports.removeMember = async ({ id, teamId }) => {
  const [deletedMember] = await sql`
        delete
        from team_members
        where id = ${id}
          and team_id = ${teamId} returning *;`;
  return deletedMember;
};

exports.getTeamByManagerEmail = async ({ email }) => {
  const [team] = await sql`
        SELECT t.*, u.*, t.id as t_id, u.id as u_id
        FROM teams t
                 join users u
                      on t.manager_id = u.id
        WHERE u.email = ${email}
          and u.role = 'team_manager'`;
  return team;
};

exports.getAllTeamsWEmail = async () => {
  return sql`
        SELECT t.*, t.id as t_id, u.id as u_id, u.email
        FROM teams t
                 left join users u
                           on t.manager_id = u.id
                               and u.role = 'team_manager'
        order by t.id desc`;
};

exports.getTeamWEmailOptionalById = async ({ teamId }) => {
  const [team] = await sql`
        SELECT t.*, t.id as t_id, u.id as u_id, u.email
        FROM teams t
                 left join users u
                           on t.manager_id = u.id and u.role = 'team_manager'
        WHERE t.id = ${teamId}`;
  return team;
};

exports.getTeamsWEmailOptionalById = async ({ teamIds }) => {
  return sql`
        SELECT t.*, t.id as t_id, u.id as u_id, u.email
        FROM teams t
                 left join users u
                           on t.manager_id = u.id and u.role = 'team_manager'
        WHERE t.id in ${sql(teamIds)}`;
};

exports.getTeamWSquad = async ({ teamId }) => {
  const [team] = await sql`
        SELECT *
        FROM teams
        WHERE id = ${teamId}`;
  const members = await sql`
        SELECT *
        FROM team_members
        WHERE team_id = ${teamId}`;
  return { team, members };
};

exports.getEventByEventIdnClubId = async ({ clubId, eventId }) => {
  return sql`
        select *
        from event
        where id = ${eventId}
          and club_id = ${clubId}
        order by id desc`;
};

exports.getTeamRequestsByOrganizerId = async ({ organizerId }) => {
  const teamRequests = await sql`
        select tr.*,
               tm.*,
               tu.*,
               tr.id         as id,
               tu.id         as tu_id,
               tm.id         as tm_id,
               tm.name       as tm_name,
               tu.name       as tu_name,
               tr.updated_at as updated_at
        from team_requests tr
                 join tournaments tu on tr.tournament_id = tu.id
                 join teams tm on tr.team_id = tm.id
        where tu.organizer_id = ${organizerId}
          and tr.request_status = 2
        order by tr.updated_at desc`;

  return teamRequests;
};

exports.getTeamRequestsByTournamentId = async ({
  tournamentId,
  organizerId,
}) => {
  const teamRequests = await sql`
        select tr.*,
               tm.*,
               tu.*,
               tr.id         as id,
               tu.id         as tu_id,
               tm.id         as tm_id,
               tm.name       as tm_name,
               tu.name       as tu_name,
               tr.updated_at as updated_at
        from team_requests tr
                 join tournaments tu on tr.tournament_id = tu.id
                 join teams tm on tr.team_id = tm.id
        where tu.organizer_id = ${organizerId}
          and tr.request_status = 2
          and tu.id = ${tournamentId}
        order by tr.updated_at desc`;

  return teamRequests;
};

exports.getAllTeams = ({ organizerId }) => {
  return sql`SELECT *
               FROM teams ${
                 organizerId
                   ? sql`WHERE organizer_id =
                               ${organizerId}`
                   : sql``
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
        insert into team_members ${sql(member)} on conflict (id)
        do
        update set ${sql(member)}
            returning *`;
  return upsertedMember;
};

exports.saveTeamsTournaments = async ({
  payload,
  tournamentName,
  managerEmail,
  sendEmail = false,
}) => {
  // constraint_name:
  let insertedTeamsTournaments;
  try {
    [insertedTeamsTournaments] = await sql`
            insert into teams_tournaments ${sql(payload)} returning *`;
  } catch (error) {
    if (error.code === "23505")
      throw new CustomError("Team already added to Tournament!", 409);
  }

  if (sendEmail === true) {
    //send email
    const html = generateTournamentInvitationContent({
      tournamentName,
    });
    const subject = `Team added on ${appInfo.name}`;
    // send email to team manager with credential
    mailService.sendMail(managerEmail, subject, html);
  }

  return insertedTeamsTournaments;
};

exports.updateTeamRequest = async ({ payload }) => {
  const [updatedRequest] = await sql`
        update team_requests
        set ${sql(payload)}
        where id = ${payload.id}
          and tournament_id = ${payload.tournamentId}
          and team_id = ${payload.teamId} returning *`;

  return updatedRequest;
};

exports.searchTeam = async ({ searchKeyword }) => {
  return sql`
        SELECT t.*, u.*, t.id as t_id, u.id as u_id, t.name as t_name, u.name as u_name
        FROM teams t
                 left join users u on t.manager_id = u.id
        where t.name ilike concat('%', ${searchKeyword}::text
            , '%')
           or u.email = ${searchKeyword}`;
};

exports.getMatchesByTeam = async ({ teamId }) => {
  const matches = await sql`
        SELECT m.*,
               t.name  as tournament_name,
               md.id   as md_id,
               md.match_date,
               f.id    as f_id,
               f.name  as field_name,
               t1.name AS home_team_name,
               t2.name AS away_team_name,
               mr.home_team_score,
               mr.away_team_score,
               mr.winner_id
        FROM matches m
                 JOIN tournaments t on m.tournament_id = t.id
                 LEFT JOIN match_results mr ON m.id = mr.match_id
                 LEFT JOIN match_days md on m.match_day_id = md.id
                 LEFT JOIN fields f on m.field_id = f.id
                 LEFT JOIN teams t1 ON m.home_team_id = t1.id
                 LEFT JOIN teams t2 ON m.away_team_id = t2.id
        WHERE home_team_id = ${teamId}
           OR away_team_id = ${teamId}
    `;

  const now = new Date();
  const pastMatches = matches.filter((match) => match.startTime < now);
  const futureMatches = matches.filter((match) => match.startTime >= now);

  return { pastMatches, futureMatches };
};
