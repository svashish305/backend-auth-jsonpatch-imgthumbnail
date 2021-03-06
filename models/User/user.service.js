﻿const path = require("path");
const config = require("../../config.json");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jsonpatch = require("jsonpatch");
const validUrl = require('valid-url');
const imageThumbnail = require('image-thumbnail');
const base64Img = require('base64-img');
const uniqueFilename = require('unique-filename');
const db = require("../../db");
const Role = require("../../role");

module.exports = {
  authenticate,
  refreshToken,
  revokeToken,
  register,
  getAll,
  getById,
  create,
  update,
  delete: _delete,
  getLoggedInUser,
  patchJson,
  generateImageThumbnail
};

async function authenticate({ email, password, ipAddress }) {
  const user = await db.User.findOne({ email });

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    throw "Email or password is incorrect";
  }

  const jwtToken = generateJwtToken(user);
  const refreshToken = generateRefreshToken(user, ipAddress);

  await refreshToken.save();

  return  {
    ...basicDetails(user),
    jwtToken,
    refreshToken: refreshToken.token,
  };
}

async function refreshToken({ token, ipAddress }) {
  const refreshToken = await getRefreshToken(token);
  const { user } = refreshToken;

  const newRefreshToken = generateRefreshToken(user, ipAddress);
  refreshToken.revoked = Date.now();
  refreshToken.revokedByIp = ipAddress;
  refreshToken.replacedByToken = newRefreshToken.token;
  await refreshToken.save();
  await newRefreshToken.save();

  const jwtToken = generateJwtToken(user);

  return {
    ...basicDetails(user),
    jwtToken,
    refreshToken: newRefreshToken.token,
  };
}

async function revokeToken({ token, ipAddress }) {
  const refreshToken = await getRefreshToken(token);

  refreshToken.revoked = Date.now();
  refreshToken.revokedByIp = ipAddress;
  await refreshToken.save();
}

async function register(params, origin) {
  const user = new db.User(params);

  // const isFirstUser = (await db.User.countDocuments({})) === 0;
  // user.role = isFirstUser ? Role.Admin : Role.User;
  user.verificationToken = randomTokenString();

  user.passwordHash = hash(params.password);

  await user.save();
}

async function getAll() {
  const users = await db.User.find();
  return users.map((x) => basicDetails(x));
}

async function getById(id) {
  const user = await getUser(id);
  return basicDetails(user);
}

async function create(params) {
  if (await db.User.findOne({ email: params.email })) {
    throw 'Email "' + params.email + '" is already registered';
  }

  const user = new db.User(params);
  user.verified = Date.now();

  user.passwordHash = hash(params.password);

  await user.save();

  return basicDetails(user);
}

async function update(id, params) {
  const user = await getUser(id);

  if (
    params.email &&
    user.email !== params.email &&
    (await db.User.findOne({ email: params.email }))
  ) {
    throw 'Email "' + params.email + '" is already taken';
  }

  if (params.password) {
    params.passwordHash = hash(params.password);
  }

  Object.assign(user, params);
  user.updated = Date.now();
  await user.save();

  return basicDetails(user);
}

async function _delete(id) {
  const user = await getUser(id);
  await user.remove();
}

// helper functions

async function getUser(id) {
  if (!db.isValidId(id)) throw "User not found";
  const user = await db.User.findById(id);
  if (!user) throw "User not found";
  return user;
}

async function getRefreshToken(token) {
  const refreshToken = await db.RefreshToken.findOne({ token }).populate(
    "user"
  );
  if (!refreshToken || !refreshToken.isActive) throw "Invalid token";
  return refreshToken;
}

function hash(password) {
  return bcrypt.hashSync(password, 10);
}

function generateJwtToken(user) {
  return jwt.sign({ sub: user.id, id: user.id }, config.secret, {
    expiresIn: "60m",
  });
}

function generateRefreshToken(user, ipAddress) {
  return new db.RefreshToken({
    user: user.id,
    token: randomTokenString(),
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    createdByIp: ipAddress,
  });
}

function randomTokenString() {
  return crypto.randomBytes(40).toString("hex");
}

function basicDetails(user) {
  const { id, email, role, jobApplications, created, updated } = user;
  return { id, email, role, jobApplications, created, updated };
}

async function getLoggedInUser(id) {
  const user = await db.User.findById(id);
  return user;
}

async function patchJson(doc, patch) {
  const patchedJson = await jsonpatch.apply_patch(doc, patch);
  return patchedJson;
}

async function generateImageThumbnail(url) {
  try {
    if(validUrl.isUri(url)) {
      const options = { width: 50, height: 50, responseType: 'base64' }
      const thumbnail = await imageThumbnail({uri: url}, options);
      const dir = path.resolve(appRoot, "thumbnails");
      const randomFileName = uniqueFilename(dir, 'img');
      base64Img.img(`data:image/png;base64,${thumbnail}`, '', randomFileName, function(err, filepath) {
        if(err) console.log(err);
      });
    } else {
      console.error('Not a valid Url!');
    }
  } catch (err) {
      console.error(err);
  }
}
