const CustomError = require("../model/CustomError");
const { sql } = require("../db");
const {
  removeImages,
  generateManagerCredentialContent,
  appInfo,
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
      console.log(31, foundTeamManager);
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
  console.log(3, foundUser);
  if (!foundUser) {
    foundUser = await userService.save({
      payload: {
        email: payload.email,
        role: "team_manager",
      },
    });
    sendEmail = true;
    console.log(4, sendEmail);
  }

  if (sendEmail) {
    console.log(5, sendEmail);
    const html = generateManagerCredentialContent({
      teamName: payload.name,
      credential: { email: foundUser.email, password: foundUser.password },
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
        insert into teams ${sql(team)}
        on conflict (id)
        do update set ${sql(team)} returning *`;

  return insertedTeam;
};

exports.removeTeam = async ({ teamId }) => {
  const [deletedTeam] = await sql`
        delete
        from teams
        where id = ${teamId}
        returning *;`;

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
          and team_id = ${teamId}
        returning *;`;
  return deletedMember;
};

exports.getTeamByManagerEmail = async ({ email }) => {
  const [team] = await sql`SELECT t.*, u.*, t.id as t_id, u.id as u_id
                             FROM teams t
                                      join users u
                                           on t.manager_id = u.id
                             WHERE u.email = ${email}
                               and u.role = 'team_manager'`;
  return team;
};

exports.getAllTeamsWEmail = async () => {
  return sql`SELECT t.*, t.id as t_id, u.id as u_id, u.email
               FROM teams t
                        left join users u
                             on t.manager_id = u.id
                                 and u.role = 'team_manager'
               order by t.id desc`;
};

exports.getTeamWEmailOptionalById = async ({ teamId }) => {
  const [team] = await sql`SELECT t.*, t.id as t_id, u.id as u_id, u.email
                             FROM teams t
                                      left join users u
                                           on t.manager_id = u.id  and u.role = 'team_manager'
                             WHERE t.id = ${teamId}`;
  console.log(team)
  return team;
};

exports.getTeamWSquad = async ({ teamId }) => {
  const teamMembers = await sql`SELECT *
                                  FROM team_members
                                  WHERE team_id = ${teamId}`;
  return teamMembers;
};

exports.getEventByEventIdnClubId = async ({ clubId, eventId }) => {
  return sql`
        select *
        from event
        where id = ${eventId}
          and club_id = ${clubId}
        order by id desc`;
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
        insert into team_members ${sql(member)}
        on conflict (id)
        do update set ${sql(member)}
        returning *`;
  return upsertedMember;
};
