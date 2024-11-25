const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const CustomError = require("../model/CustomError");
const { sql } = require("../db");
const { ifManager, ifOrganizer } = require("../others/util");

exports.generatePassword = (length = 8) => {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,/()-*&^%$#@!";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

exports.save = async ({ payload: user }) => {
  user.role = user.role.toLowerCase();

  if (!["organizer", "team_manager"].includes(user.role)) {
    throw new CustomError("Bad request", 400);
  }

  // if add request
  if (!user.id) {
    delete user.id;
  }
  // if route is registration
  if (!user.password) {
    user.password = exports.generatePassword();
  }
  let upsertedUser = null;
  try {
    [upsertedUser] = await sql`
            insert into users ${sql(user)} on conflict (id)
            do
            update set ${sql(user)}
                returning *`;
  } catch (err) {
    if (err.code === "23505")
      throw new CustomError("Email already taken!", 409);
    else throw err;
  }
  return upsertedUser;
};

const generateAuthData = async (result) => {
  let token = "";
  let currentUser = {};
  if (result) {
    currentUser = {
      id: result.id,
      email: result.email,
      role: result.role.toLowerCase(),
    };

    ifManager(currentUser.role);
    {
      const teams = await sql`
                select *
                from teams
                where manager_id = ${result.id}`;

      if (teams.length > 0) {
        currentUser.teamId = teams[0].id;
        currentUser.teamName = teams[0].name;
      }
    }
    if (ifOrganizer(currentUser.role)) {
    }
    token = jwt.sign({ currentUser }, process.env.TOKEN_SECRET);
  }
  return { token, currentUser };
};

exports.signin = async ({ email, password }) => {
  const result = await sql`select *
                             from users
                             where email = ${email}
                               and password = ${password}`;

  if (result.length > 0) {
    return generateAuthData(result[0]);
  } else {
    throw new CustomError("Incorrect email/password!", 401);
  }
};

exports.getUsers = () => {
  return sql`select *
               from users
               where role in ${sql(["organizer", "team_manager"])}`;
};

exports.getUserByEmail = async ({ email }) => {
  const [user] = await sql`select *
                             from users
                             where email = ${email}`;
  return user;
};

exports.removeUser = async ({ userId }) => {
  const [deletedUser] = await sql`delete
                                    from users
                                    where id = ${userId}
                                      and role in ${sql([
                                        "organizer",
                                        "team_manager",
                                      ])} returning *`;
  return deletedUser;
};
