import * as freelancerRepository from "../repositories/freelancerRepository.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "node:crypto";
import * as profileRepository from "../repositories/profileRepository.js";
import * as fileRepository from "../repositories/fileRepository.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "../uploads");
const VALID_SKILL_LEVELS = ["beginner", "intermediate", "advanced", "expert"];

function validationError(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function notFoundError(message) {
  const err = new Error(message);
  err.statusCode = 404;
  return err;
}

function parsePositiveInt(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw validationError(`Valid ${label} is required.`);
  }
  return parsed;
}

function parseBase64Image(data) {
  if (typeof data !== "string" || !data.includes("base64,")) {
    throw validationError("Invalid image data.");
  }

  const [meta, payload] = data.split("base64,");
  const mimeMatch = meta.match(/data:(image\/[^;]+);/);
  if (!mimeMatch) {
    throw validationError("Invalid image type.");
  }

  const supported = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
  };
  const extension = supported[mimeMatch[1]];
  if (!extension) {
    throw validationError("Unsupported image type.");
  }

  return { buffer: Buffer.from(payload, "base64"), extension };
}

async function ensureUploadsDir() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

function normalizeSkills(skills) {
  if (skills == null) return null;
  if (!Array.isArray(skills)) {
    throw validationError("Skills must be an array.");
  }

  const seen = new Set();
  return skills.map((entry, index) => {
    const skillID = parsePositiveInt(
      entry?.skillID,
      `skill ID at position ${index + 1}`,
    );
    if (seen.has(skillID)) {
      throw validationError("Duplicate skills are not allowed.");
    }
    seen.add(skillID);

    const sLevel = String(entry?.sLevel ?? "").trim().toLowerCase();
    if (!VALID_SKILL_LEVELS.includes(sLevel)) {
      throw validationError("Skill level is invalid.");
    }

    const yearsOfExp = Number(entry?.yearsOfExp);
    if (!Number.isInteger(yearsOfExp) || yearsOfExp < 0) {
      throw validationError(
        "Years of experience must be a non-negative integer.",
      );
    }

    return { skillID, sLevel, yearsOfExp };
  });
}

async function getProfileBundle(userID) {
  const profile = await freelancerRepository.findFreelancerProfileByUserId(userID);
  if (!profile) {
    throw notFoundError("Freelancer not found.");
  }

  const [skills, stats] = await Promise.all([
    freelancerRepository.listFreelancerSkillsByUserId(userID),
    freelancerRepository.getFreelancerStats(userID),
  ]);

  return {
    profile: {
      ...profile,
      hourlyRate: profile.hourlyRate ?? null,
      portofoliUrl: profile.portofoliUrl ?? null,
      bio: profile.bio ?? null,
      skills,
    },
    stats: {
      totalApplications: Number(stats?.totalApplications ?? 0),
      pendingApplications: Number(stats?.pendingApplications ?? 0),
      totalProjects: Number(stats?.totalProjects ?? 0),
      activeProjects: Number(stats?.activeProjects ?? 0),
      completedProjects: Number(stats?.completedProjects ?? 0),
      averageRating:
        stats?.averageRating == null ? null : Number(stats.averageRating),
      reviewCount: Number(stats?.reviewCount ?? 0),
      totalEarnings: Number(stats?.totalEarnings ?? 0),
    },
  };
}

export async function getPublicProfile(userID) {
  const freelancerID = parsePositiveInt(userID, "freelancer ID");
  const bundle = await getProfileBundle(freelancerID);
  const previousProjects =
    await freelancerRepository.listFreelancerPreviousProjects(freelancerID);

  return {
    ...bundle,
    previousProjects,
  };
}

export async function getDashboard(userID) {
  const freelancerID = parsePositiveInt(userID, "freelancer ID");
  const [bundle, previousProjects] = await Promise.all([
    getProfileBundle(freelancerID),
    freelancerRepository.listFreelancerPreviousProjects(freelancerID, 3),
  ]);

  return {
    ...bundle,
    previousProjects,
  };
}

export async function getProfile(userID) {
  const freelancerID = parsePositiveInt(userID, "freelancer ID");
  return getProfileBundle(freelancerID);
}

export async function getAvailableSkills() {
  return freelancerRepository.listAvailableSkills();
}

export async function updateProfile(userID, payload) {
  const freelancerID = parsePositiveInt(userID, "freelancer ID");
  if (!payload || typeof payload !== "object") {
    throw validationError("Profile data is required.");
  }

  let existing = await profileRepository.findProfileByUserId(freelancerID);
  if (!existing) {
    existing = await profileRepository.createProfileForUser(freelancerID);
  }

  let pictureID = existing.pictureID;
  if (payload.pictureBase64) {
    const { buffer, extension } = parseBase64Image(payload.pictureBase64);
    const fileName = `${randomUUID()}.${extension}`;
    await ensureUploadsDir();
    const filePath = `/uploads/${fileName}`;
    await fs.writeFile(path.join(UPLOADS_DIR, fileName), buffer);

    const fileRecord = await fileRepository.createFile({
      entity: "Profile",
      entityID: existing.id,
      nameFile: fileName,
      filePath,
      fileSize: buffer.length,
      uploadedBy: freelancerID,
    });

    pictureID = fileRecord.id;
  }

  const hourlyRate = Object.prototype.hasOwnProperty.call(payload, "hourlyRate")
    ? payload.hourlyRate == null || payload.hourlyRate === ""
      ? null
      : Number(payload.hourlyRate)
    : existing.hourlyRate;
  const portofoliUrl = Object.prototype.hasOwnProperty.call(
    payload,
    "portofoliUrl",
  )
    ? String(payload.portofoliUrl ?? "").trim() || null
    : existing.portofoliUrl;
  const bio = Object.prototype.hasOwnProperty.call(payload, "bio")
    ? String(payload.bio ?? "").trim() || null
    : existing.bio;

  if (hourlyRate != null && (Number.isNaN(hourlyRate) || hourlyRate < 0)) {
    throw validationError("Hourly rate must be a non-negative number.");
  }
  if (bio != null && bio.length > 255) {
    throw validationError("Bio must be 255 characters or fewer.");
  }

  await profileRepository.updateProfileByUserId(freelancerID, {
    pictureID,
    hourlyRate,
    portofoliUrl,
    bio,
  });

  const normalizedSkills = normalizeSkills(payload.skills);
  if (normalizedSkills) {
    await freelancerRepository.replaceFreelancerSkills(
      existing.id,
      normalizedSkills,
    );
  }

  return getProfileBundle(freelancerID);
}
