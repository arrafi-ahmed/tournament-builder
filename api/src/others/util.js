const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const { API_BASE_URL, VUE_BASE_URL, ANDROID_BASE_URL } = process.env;

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

const generatePassResetContent = (token, CLIENT_BASE_URL) => {
  return `
    Greetings!
    
    Click the button to reset password, will be valid for 1 hour.
    <a href="${CLIENT_BASE_URL}/reset-password/?token=${token}"><button style="background-color: #e40046; color: white; border: none; padding: 10px;">Reset Password</button></a>
    
    Best wishes,
    ${appInfo.name}`;
};

const generateManagerCredentialContent = ({ teamName, credential }) => {
  return `
    Greetings!
    
    Your email has added as team manager for ${teamName}.
    Email: ${credential.email}
    Password: ${credential.password}
    
    Best wishes,
    ${appInfo.name}`;
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

const appInfo = { name: "TournaPro", version: 1.0 };

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
  generateManagerCredentialContent,
  moveImage,
  getPrefix,
  getDirPath,
  getFilePath,
  removeImages,
  formatDate,
  ifSudo,
  ifOrganizer,
  ifManager,
  // generateQrCode,
  // logoSvgString,
};
