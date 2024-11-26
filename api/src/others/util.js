const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const { API_BASE_URL, VUE_BASE_URL, ANDROID_BASE_URL } = process.env;

const appInfo = { name: "TotaLiga", version: 1.1 };

const formatDate = (inputDate) => {
  const date = new Date(inputDate);
  const day = `0${date.getDate()}`.slice(-2);
  const month = `0${date.getMonth() + 1}`.slice(-2);
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const ifSudo = (role) => role === "sudo";
const ifOrganizer = (role) => role === "organizer";
const ifManager = (role) => role === "team_manager";

const removeOtherParams = (obj, allowedKeys) => {
  Object.keys(obj).forEach((key) => {
    if (!allowedKeys.includes(key)) {
      delete obj[key]; // Remove the key if it is not in allowedKeys
    }
  });
  return obj;
};
const emailFooter = `   
    <br>
    <p>Best wishes,<br>
    The <strong>${appInfo.name}</strong> Team</p>`;

const generatePassResetContent = (token) => {
  return `
    <p>Greetings!</p>

    <p>We received a request to reset your password. To proceed, please click the button below. This link will be valid for the next 1 hour:</p>

    <p><a href="${VUE_BASE_URL}/reset-password/?token=${token}">
      <button style="background-color: #e40046; color: white; border: none; padding: 10px;">Reset Password</button>
    </a></p>

    <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>

    ${emailFooter}
  `;
};

const generateManagerCredentialContent = ({ teamName, credential }) => {
  return `
    <p>Greetings!</p>

    <p>We are excited to inform you that you have been added as the team manager for <strong>'${teamName}'</strong>.</p>

    <p><strong>Your Credentials:</strong><br>
    Username: ${credential.username}<br>
    Password: ${credential.password}</p>

    <p>Please keep these credentials safe, as you'll need them to manage your team's details and access tournament information.</p>

    <p>If you have any questions or need assistance, feel free to reach out. We wish you all the best as you manage your team!</p>

    ${emailFooter}
  `;
};

const generateTournamentInvitationContent = ({
  tournamentName,
  credential,
}) => {
  return `
    <p>Greetings!</p>

    <p>We are excited to inform you that your team has been added to the tournament <strong>'${tournamentName}'</strong>!</p> 

    <p>We look forward to your team's participation and wish you the best of luck!</p>

    ${emailFooter}
  `;
};

const generateBroadcastEmailContent = ({ tournament, broadcastType }) => {
  let mainContent = "";
  let subject = "";
  if (broadcastType === "schedule_created") {
    mainContent = `
        <p>
          We’re pleased to inform you that your team has been added to new match schedule for the tournament "${tournament.name}".
        </p>
        <p>To view the latest schedule of the tournament:</p>`;
    subject = `New Match Schedule Added for Tournament '${tournament.name}'`;
  } else if (broadcastType === "schedule_updated") {
    mainContent = `
        <p>
          We’re pleased to inform you that your team's match schedule updated for the tournament "${tournament.name}".
        </p>
        <p>To view the latest schedule of the tournament:</p>`;
    subject = `Match Schedule Updated for Tournament '${tournament.name}'`;
  } else if (broadcastType === "schedule_deleted") {
    mainContent = `
        <p>
          Your team's match schedule deleted for the tournament "${tournament.name}".
        </p>
        <p>To view the latest schedule of the tournament:</p>`;
    subject = `Match Schedule Deleted for Tournament '${tournament.name}'`;
  } else if (broadcastType === "result_published") {
    mainContent = `
        <p>
          We’re excited to inform you that new result has been published for the tournament "${tournament.name}".
        </p>
        <p>To view the latest standing of the tournament:</p>`;
    subject = `New Result Published for Tournament '${tournament.name}'`;
  }
  const bodyHtml = `
    <p>Greetings!</p>
    
    ${mainContent}
    
    <a href="${VUE_BASE_URL}/tournament/${tournament.id}?ref=${broadcastType === "result_published" ? "standing" : "schedule"}" style="text-decoration: none;">
      <button style="background-color: #2460ad; color: white; border: none; padding: 10px; border-radius: 5px; font-size: 16px; cursor: pointer;">
        View Tournament
      </button>
    </a>
    
    ${emailFooter}
  `;
  return { bodyHtml, subject };
};

const moveImage = (sourcePath, destinationPath) => {
  return new Promise((resolve, reject) => {
    fs.rename(sourcePath, destinationPath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const dirMap = {
  tmp: path.join(__dirname, "..", "..", "public", "tmp"),
  user: path.join(__dirname, "..", "..", "public", "user"),
  teamLogo: path.join(__dirname, "..", "..", "public", "team-logo"),
};

const getPrefix = (filename) => {
  return filename.split("-")[0];
};

const getDirPath = (prefix) => {
  return dirMap[prefix];
};

const getFilePath = (filename, prefix) => {
  const calcPrefix = prefix || getPrefix(filename);
  return path.join(dirMap[calcPrefix], filename);
};

const removeImages = async (imageArr) => {
  imageArr.map((image) => {
    const filePath = getFilePath(image);
    if (filePath) {
      return fs.unlink(filePath);
    } else {
      console.error("Invalid file path:", filePath);
      return Promise.resolve(); // Return a resolved promise to prevent further errors.
    }
  });
};

const getCurrencySymbol = (currencyCode, type) => {
  const currencyCodeLower = currencyCode.toString().toLowerCase();

  const currencyMap = {
    usd: { icon: "mdi-currency-usd", symbol: "$" },
    gbp: { icon: "mdi-currency-gbp", symbol: "£" },
    eur: { icon: "mdi-currency-eur", symbol: "€" },
  };

  return currencyMap[currencyCodeLower][type];
};

// const generateQrCode = async (data) => await qr.toDataURL(data);
// const logoSvgString = fsSync.readFileSync(
//   path.join(__dirname, "./logo.svg"),
//   "utf8"
// );

module.exports = {
  API_BASE_URL,
  VUE_BASE_URL,
  ANDROID_BASE_URL,
  dirMap,
  appInfo,
  getCurrencySymbol,
  generatePassResetContent,
  generateTournamentInvitationContent,
  generateManagerCredentialContent,
  generateBroadcastEmailContent,
  moveImage,
  getPrefix,
  getDirPath,
  getFilePath,
  removeImages,
  formatDate,
  removeOtherParams,
  ifSudo,
  ifOrganizer,
  ifManager,
};
