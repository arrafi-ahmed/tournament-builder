const CustomError = require("../model/CustomError");
const { sql } = require("../db");
const {
  removeImages,
  generateManagerCredentialContent,
  appInfo,
  ifSudo,
  ifOrganizer,
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
  // currentUser is sudo
  else if (ifOrganizer(currentUser.role)) {
    payload.organizerId = currentUser.id;
  }
  delete payload.organizerEmail;
  delete payload.email;
  delete payload.tId;
  delete payload.uId;

  console.log(93, payload)
  const [insertedTournament] = await sql`
        insert into tournaments ${sql(payload)}
        on conflict (id)
        do update set ${sql(payload)} returning *`;

  return insertedTournament;
};

exports.removeTournament = async ({ tournamentId }) => {
  const [deletedTournament] = await sql`
        delete
        from tournaments
        where id = ${tournamentId}
        returning *;`;

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
          and tournament_id = ${tournamentId}
        returning *;`;
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

exports.getTournamentWEmailOptionalById = async ({ tournamentId }) => {
  const [tournament] = await sql`SELECT t.*, t.id as t_id, u.id as u_id, u.email
                                   FROM tournaments t
                                            left join users u
                                                      on t.organizer_id = u.id and u.role = 'organizer'
                                   WHERE t.id = ${tournamentId}`;

  return tournament;
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

exports.getAllTournaments = ({ organizerId }) => {
  return sql`
        SELECT *
        FROM tournaments ${
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
        insert into tournament_members ${sql(member)}
        on conflict (id)
        do update set ${sql(member)}
        returning *`;
  return upsertedMember;
};
