// utils/updateProjectProgress.js
const Project = require("../models/Project");
const Milestone = require("../models/Milestone");

async function updateProjectProgress(projectId) {
  const milestones = await Milestone.find({ project: projectId });
  if (!milestones.length) return;

  const completed = milestones.filter(m => m.status === "released" || m.status === "completed").length;
  const progress = Math.round((completed / milestones.length) * 100);

  await Project.findByIdAndUpdate(projectId, { progress });
}

module.exports = updateProjectProgress;
